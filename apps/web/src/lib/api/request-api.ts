import axios from "axios";
import type { ApiResponse } from "@vocalwonder/core";

type RequestApi = {
  url: string;
  method?: "get" | "post" | "put" | "patch" | "delete";
  data?: unknown;
};

/**
 * Single transport layer for all API calls. Sends cookies automatically
 * (`withCredentials`), unwraps the `{ success, data }` envelope and normalises
 * errors — callers receive `T` directly or a thrown `Error`.
 */
export async function requestApi<T>({ url, method = "get", data }: RequestApi): Promise<T> {
  const isFormData = typeof FormData !== "undefined" && data instanceof FormData;

  try {
    const response = await axios<ApiResponse<T>>({
      url,
      method,
      data,
      withCredentials: true,
      timeout: 5000,
      headers: isFormData ? {} : { "Content-Type": "application/json" },
    });

    const body = response.data;
    if (!body.success) {
      throw new Error(body.error.message);
    }
    return body.data;
  } catch (err) {
    if (axios.isAxiosError(err)) {
      const body = err.response?.data as ApiResponse<T> | undefined;
      if (body && body.success === false) {
        throw new Error(body.error.message);
      }
    }
    throw err;
  }
}
