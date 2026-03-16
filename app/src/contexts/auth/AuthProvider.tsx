import { useState, useEffect } from "react";
import type { ReactNode } from "react";
import { AuthContext, type User } from "./useAuth";

const MOCK_USERS = [
  { id: "1", username: "admin", password: "admin", email: "admin@example.com" },
  {
    id: "2",
    username: "user",
    password: "password",
    email: "user@example.com",
  },
];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem("auth-user");
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (
    username: string,
    password: string,
  ): Promise<boolean> => {
    setIsLoading(true);

    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const mockUser = MOCK_USERS.find(
      (u) => u.username === username && u.password === password,
    );

    if (mockUser) {
      const userData = {
        id: mockUser.id,
        username: mockUser.username,
        email: mockUser.email,
      };
      setUser(userData);
      localStorage.setItem("auth-user", JSON.stringify(userData));
      setIsLoading(false);
      return true;
    }

    setIsLoading(false);
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("auth-user");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}
