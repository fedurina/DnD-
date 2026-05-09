import { useAuthStore } from "@/store/auth";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
const API_PREFIX = "/api/v1";

export class ApiError extends Error {
  status: number;
  data: unknown;
  constructor(status: number, data: unknown, message: string) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

// Русские подписи для известных полей — используются в ошибках валидации FastAPI.
const FIELD_LABELS_RU: Record<string, string> = {
  email: "Email",
  username: "Имя пользователя",
  password: "Пароль",
  current_password: "Текущий пароль",
  new_password: "Новый пароль",
  name: "Название",
  description: "Описание",
  invite_code: "Код приглашения",
  max_level: "Максимальный уровень",
  level: "Уровень",
  allowed_races: "Разрешённые расы",
  allowed_classes: "Разрешённые классы",
  master_notes: "Заметки мастера",
  ability_scores: "Характеристики",
  background_bonuses: "Бонусы предыстории",
  chosen_skills: "Выбранные навыки",
  feats: "Черты",
  languages: "Языки",
  alignment: "Мировоззрение",
  gender: "Пол",
  race_code: "Раса",
  class_code: "Класс",
  subclass_code: "Подкласс",
  background_code: "Предыстория",
  current_hp: "Текущие хиты",
  temp_hp: "Временные хиты",
  character_id: "Персонаж",
};

function fieldLabel(loc: unknown): string | null {
  if (!Array.isArray(loc)) return null;
  // Берём последний строковый сегмент, пропуская "body"/"query"/"path".
  for (let i = loc.length - 1; i >= 0; i--) {
    const part = loc[i];
    if (typeof part === "string" && part !== "body" && part !== "query" && part !== "path") {
      return FIELD_LABELS_RU[part] ?? part;
    }
  }
  return null;
}

function pluralRu(n: number, forms: [string, string, string]): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return forms[1];
  return forms[2];
}

// Возвращаем `{ text, withLabel }`: если withLabel=false — текст уже самодостаточен
// (например, наше русское сообщение из ValueError), и подставлять название поля не надо.
interface TranslatedItem {
  text: string;
  withLabel: boolean;
}

function translateValidationItem(item: {
  type?: string;
  msg?: string;
  ctx?: Record<string, unknown>;
}): TranslatedItem {
  const ctx = item.ctx ?? {};
  const msg = item.msg ?? "";
  const t = (text: string, withLabel = true): TranslatedItem => ({ text, withLabel });

  switch (item.type) {
    case "missing":
      return t("поле обязательно");
    case "string_too_short": {
      const n = ctx.min_length;
      return t(
        typeof n === "number"
          ? `минимум ${n} ${pluralRu(n, ["символ", "символа", "символов"])}`
          : "слишком короткое значение",
      );
    }
    case "string_too_long": {
      const n = ctx.max_length;
      return t(
        typeof n === "number"
          ? `максимум ${n} ${pluralRu(n, ["символ", "символа", "символов"])}`
          : "слишком длинное значение",
      );
    }
    case "string_pattern_mismatch":
      return t("недопустимые символы");
    case "value_error": {
      // Pydantic оборачивает наши русские ValueError как "Value error, <текст>".
      const stripped = msg.replace(/^Value error,\s*/i, "");
      if (stripped && stripped !== msg) {
        // Своё сообщение от валидатора — оно уже на русском и осмысленное,
        // лейбл поля не добавляем, чтобы не дублировать.
        return t(stripped, false);
      }
      // Системные value_error от Pydantic (например, email).
      if (/email/i.test(msg)) return t("некорректный email");
      return t(stripped || "недопустимое значение");
    }
    case "int_parsing":
    case "int_type":
    case "float_parsing":
    case "float_type":
      return t("должно быть числом");
    case "bool_parsing":
    case "bool_type":
      return t("должно быть да/нет");
    case "greater_than_equal": {
      const n = ctx.ge;
      return t(typeof n === "number" ? `должно быть ≥ ${n}` : "значение слишком маленькое");
    }
    case "less_than_equal": {
      const n = ctx.le;
      return t(typeof n === "number" ? `должно быть ≤ ${n}` : "значение слишком большое");
    }
    case "greater_than": {
      const n = ctx.gt;
      return t(typeof n === "number" ? `должно быть > ${n}` : "значение слишком маленькое");
    }
    case "less_than": {
      const n = ctx.lt;
      return t(typeof n === "number" ? `должно быть < ${n}` : "значение слишком большое");
    }
    case "enum":
      return t("недопустимое значение");
    case "uuid_parsing":
    case "uuid_type":
      return t("некорректный идентификатор");
    case "value_error.email":
    case "string_email":
      return t("некорректный email");
  }
  // Незнакомый тип. Если msg на русском (есть кириллица) — отдадим как есть без лейбла.
  if (msg && /[А-Яа-яЁё]/.test(msg)) return t(msg, false);
  return t(msg || "некорректное значение");
}

function extractErrorMessage(data: unknown, status: number): string {
  const detail = (data as { detail?: unknown } | null)?.detail;

  if (typeof detail === "string" && detail.trim()) {
    return detail;
  }

  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0] as { type?: string; msg?: string; loc?: unknown; ctx?: Record<string, unknown> };
    const { text, withLabel } = translateValidationItem(first);
    const label = withLabel ? fieldLabel(first.loc) : null;
    return label ? `${label}: ${text}` : text;
  }

  if (detail && typeof detail === "object") {
    const msg = (detail as { msg?: unknown }).msg;
    if (typeof msg === "string" && msg.trim()) return msg;
  }

  // Понятные fallback'и по HTTP-коду.
  switch (status) {
    case 400:
      return "Некорректный запрос";
    case 401:
      return "Требуется вход";
    case 403:
      return "Недостаточно прав";
    case 404:
      return "Не найдено";
    case 409:
      return "Конфликт данных";
    case 413:
      return "Слишком большой запрос";
    case 422:
      return "Некорректные данные";
    case 429:
      return "Слишком много запросов, попробуйте позже";
    case 500:
      return "Ошибка сервера, попробуйте позже";
    case 502:
    case 503:
    case 504:
      return "Сервер временно недоступен";
  }
  return `Ошибка запроса (${status})`;
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  auth?: boolean;
  retryOn401?: boolean;
}

async function rawRequest(path: string, options: RequestOptions = {}): Promise<Response> {
  const { body, auth = false, headers, ...rest } = options;

  const finalHeaders = new Headers(headers);
  if (body !== undefined && !finalHeaders.has("Content-Type")) {
    finalHeaders.set("Content-Type", "application/json");
  }
  if (auth) {
    const token = useAuthStore.getState().accessToken;
    if (token) finalHeaders.set("Authorization", `Bearer ${token}`);
  }

  return fetch(`${API_URL}${API_PREFIX}${path}`, {
    ...rest,
    headers: finalHeaders,
    credentials: "include",
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export async function apiRequest<T = unknown>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { retryOn401 = true, auth = false } = options;

  let response = await rawRequest(path, options);

  if (response.status === 401 && auth && retryOn401) {
    const refreshed = await useAuthStore.getState().tryRefresh();
    if (refreshed) {
      response = await rawRequest(path, { ...options, retryOn401: false });
    }
  }

  if (!response.ok) {
    let data: unknown = null;
    try {
      data = await response.json();
    } catch {
      // игнорируем
    }
    const message = extractErrorMessage(data, response.status);
    throw new ApiError(response.status, data, message);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) =>
    apiRequest<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    apiRequest<T>(path, { ...options, method: "POST", body }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    apiRequest<T>(path, { ...options, method: "PUT", body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    apiRequest<T>(path, { ...options, method: "PATCH", body }),
  delete: <T>(path: string, options?: RequestOptions) =>
    apiRequest<T>(path, { ...options, method: "DELETE" }),
};
