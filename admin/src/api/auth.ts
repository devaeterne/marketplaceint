// API Base URL
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5050";

// Interfaces
export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  lastLogin?: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: User;
}

// Auth API Class
export class AuthAPI {
  private async makeRequest(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<{ data: any; status: number }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api${endpoint}`, {
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
        ...options,
      });

      const data = await response.json();
      return { data, status: response.status };
    } catch (error) {
      console.error("API Request Error:", error);
      throw new Error("Bağlantı hatası oluştu");
    }
  }

  async signin(credentials: LoginRequest): Promise<AuthResponse> {
    const { data, status } = await this.makeRequest("/auth/signin", {
      method: "POST",
      body: JSON.stringify(credentials),
    });

    if (status !== 200) {
      throw new Error(data.message || "Giriş başarısız");
    }

    if (data.token) {
      localStorage.setItem("authToken", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
    }

    return data;
  }

  async signup(userData: SignupRequest): Promise<AuthResponse> {
    const { data, status } = await this.makeRequest("/auth/signup", {
      method: "POST",
      body: JSON.stringify(userData),
    });

    if (status !== 201) {
      throw new Error(data.message || "Kayıt başarısız");
    }

    if (data.token) {
      localStorage.setItem("authToken", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
    }

    return data;
  }

  async verify(): Promise<User> {
    const token = localStorage.getItem("authToken");

    if (!token) {
      throw new Error("Token bulunamadı");
    }

    const { data, status } = await this.makeRequest("/auth/verify", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (status !== 200) {
      this.logout();
      throw new Error(data.message || "Token geçersiz");
    }

    return data.user;
  }

  logout(): void {
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
  }

  getToken(): string | null {
    return localStorage.getItem("authToken");
  }

  getUser(): User | null {
    const userStr = localStorage.getItem("user");
    return userStr ? JSON.parse(userStr) : null;
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }
}

// Export instance
export const authAPI = new AuthAPI();
