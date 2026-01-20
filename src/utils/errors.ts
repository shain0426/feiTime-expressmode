// src/utils/errors.ts

/**
 * 自定義 HTTP 錯誤
 * 用於 Service 層拋出特定狀態碼的錯誤
 */
export class HttpError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
    this.name = "HttpError";
  }
}

/**
 * 常見錯誤快捷方式
 */
export class BadRequestError extends HttpError {
  constructor(message: string = "請求參數錯誤") {
    super(400, message);
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message: string = "未授權") {
    super(401, message);
  }
}

export class NotFoundError extends HttpError {
  constructor(message: string = "資源不存在") {
    super(404, message);
  }
}
