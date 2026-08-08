import { api } from "@/lib/api";
import type { Page } from "@/types/common";
import type { Employee, EmployeePayload } from "@/types/employee";

export interface EmployeeListParams {
  q?: string;
  is_active?: boolean;
  page?: number;
  limit?: number;
}

export async function listEmployees(params: EmployeeListParams): Promise<Page<Employee>> {
  const { data } = await api.get<Page<Employee>>("/employees", { params });
  return data;
}

export async function getEmployee(id: string): Promise<Employee> {
  const { data } = await api.get<Employee>(`/employees/${id}`);
  return data;
}

export async function createEmployee(payload: EmployeePayload): Promise<Employee> {
  const { data } = await api.post<Employee>("/employees", payload);
  return data;
}

export async function updateEmployee(
  id: string,
  payload: Partial<EmployeePayload>,
): Promise<Employee> {
  const { data } = await api.patch<Employee>(`/employees/${id}`, payload);
  return data;
}

export async function deactivateEmployee(id: string): Promise<Employee> {
  const { data } = await api.post<Employee>(`/employees/${id}/deactivate`);
  return data;
}

export async function reactivateEmployee(id: string): Promise<Employee> {
  const { data } = await api.post<Employee>(`/employees/${id}/reactivate`);
  return data;
}
