import { Customer, Host } from '../types';
import { DEFAULT_CUSTOMER, INITIAL_HOSTS } from '../data/initialData';

const CUSTOMERS_KEY = 'zabbix_tf_customers';
const ACTIVE_CUSTOMER_KEY = 'zabbix_tf_active_customer';
const HOSTS_KEY = 'zabbix_tf_hosts';

export function loadCustomers(): Customer[] {
  try {
    const raw = localStorage.getItem(CUSTOMERS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error loading customers from localStorage', err);
  }
  return [DEFAULT_CUSTOMER];
}

export function saveCustomers(customers: Customer[]): void {
  try {
    localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(customers));
  } catch (err) {
    console.error('Error saving customers to localStorage', err);
  }
}

export function loadActiveCustomerId(): string {
  try {
    const id = localStorage.getItem(ACTIVE_CUSTOMER_KEY);
    if (id) return id;
  } catch (err) {
    console.error('Error loading active customer id', err);
  }
  return DEFAULT_CUSTOMER.customer_id;
}

export function saveActiveCustomerId(id: string): void {
  try {
    localStorage.setItem(ACTIVE_CUSTOMER_KEY, id);
  } catch (err) {
    console.error('Error saving active customer id', err);
  }
}

export function loadHosts(): Host[] {
  try {
    const raw = localStorage.getItem(HOSTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error loading hosts from localStorage', err);
  }
  return INITIAL_HOSTS;
}

export function saveHosts(hosts: Host[]): void {
  try {
    localStorage.setItem(HOSTS_KEY, JSON.stringify(hosts));
  } catch (err) {
    console.error('Error saving hosts to localStorage', err);
  }
}

export interface ExportDataPackage {
  version: string;
  exported_at: string;
  application: string;
  customers: Customer[];
  hosts: Host[];
}

export function exportAllData(customers: Customer[], hosts: Host[]): string {
  const pkg: ExportDataPackage = {
    version: '1.0.0',
    exported_at: new Date().toISOString(),
    application: 'Zabbix Trigger Factory & Best Practices',
    customers,
    hosts,
  };
  return JSON.stringify(pkg, null, 2);
}

export function importAllData(jsonStr: string): { success: boolean; message: string; data?: { customers: Customer[]; hosts: Host[] } } {
  try {
    const parsed = JSON.parse(jsonStr);
    if (!parsed.customers || !Array.isArray(parsed.customers)) {
      return { success: false, message: 'Arquivo JSON inválido: campo "customers" ausente ou corrompido.' };
    }
    if (!parsed.hosts || !Array.isArray(parsed.hosts)) {
      return { success: false, message: 'Arquivo JSON inválido: campo "hosts" ausente ou corrompido.' };
    }
    return {
      success: true,
      message: `${parsed.customers.length} clientes e ${parsed.hosts.length} hosts carregados com sucesso!`,
      data: {
        customers: parsed.customers,
        hosts: parsed.hosts,
      },
    };
  } catch (err: any) {
    return { success: false, message: `Erro ao processar JSON: ${err.message}` };
  }
}

export function wipeAllData(): void {
  try {
    localStorage.removeItem(CUSTOMERS_KEY);
    localStorage.removeItem(ACTIVE_CUSTOMER_KEY);
    localStorage.removeItem(HOSTS_KEY);
  } catch (err) {
    console.error('Error wiping localStorage', err);
  }
}

export function resetToDefaultData(): { customers: Customer[]; hosts: Host[]; activeCustomerId: string } {
  try {
    saveCustomers([DEFAULT_CUSTOMER]);
    saveActiveCustomerId(DEFAULT_CUSTOMER.customer_id);
    saveHosts(INITIAL_HOSTS);
  } catch (err) {
    console.error('Error resetting to default in localStorage', err);
  }
  return {
    customers: [DEFAULT_CUSTOMER],
    hosts: INITIAL_HOSTS,
    activeCustomerId: DEFAULT_CUSTOMER.customer_id,
  };
}
