import React, { useState, useEffect } from 'react';
import { Customer, Host, Practice, GeneratedTrigger } from './types';
import { PRACTICES_CATALOG } from './data/practices';
import { DEFAULT_CUSTOMER, INITIAL_HOSTS } from './data/initialData';
import {
  loadCustomers,
  saveCustomers,
  loadActiveCustomerId,
  saveActiveCustomerId,
  loadHosts,
  saveHosts,
  resetToDefaultData,
  wipeAllData,
} from './utils/storage';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar, ActiveTab } from './components/Navbar';
import { OverviewView } from './components/OverviewView';
import { ComplianceDashboardView } from './components/ComplianceDashboardView';
import { IntegrationsView } from './components/IntegrationsView';
import { RequirementValidatorView } from './components/RequirementValidatorView';
import { CatalogView } from './components/CatalogView';
import { TriggerFactoryView } from './components/TriggerFactoryView';
import { TriggerAuditView } from './components/TriggerAuditView';
import { HostInventoryView } from './components/HostInventoryView';
import { ClientManagerView } from './components/ClientManagerView';
import { SyntaxSimulatorView } from './components/SyntaxSimulatorView';
import { SecurityComplianceView } from './components/SecurityComplianceView';
import { DocumentationView } from './components/DocumentationView';
import { ZabbixGuidanceModal } from './components/ZabbixGuidanceModal';
import { LoginModal } from './components/LoginModal';
import { RotateCcw, Plus, AlertCircle, ShieldCheck } from 'lucide-react';

function AppContent() {
  const { user, syncDataToCloud, loadDataFromCloud, logAuditEvent } = useAuth();

  const [customers, setCustomers] = useState<Customer[]>(() => loadCustomers());
  const [activeCustomerId, setActiveCustomerId] = useState<string>(() => loadActiveCustomerId());
  const [hosts, setHosts] = useState<Host[]>(() => loadHosts());
  const [practices, setPractices] = useState<Practice[]>(PRACTICES_CATALOG);

  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedHostId, setSelectedHostId] = useState<string>(() => hosts[0]?.host_id || '');
  const [preselectedPracticeId, setPreselectedPracticeId] = useState<string | null>(null);
  const [preselectedSimulatorTrigger, setPreselectedSimulatorTrigger] = useState<GeneratedTrigger | null>(null);

  // Modals
  const [isGuidanceOpen, setIsGuidanceOpen] = useState(false);
  const [guidanceTrigger, setGuidanceTrigger] = useState<GeneratedTrigger | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Sync active customer
  const activeCustomer =
    customers.find((c) => c.customer_id === activeCustomerId) || customers[0] || null;

  // Local storage persistence
  useEffect(() => {
    saveCustomers(customers);
  }, [customers]);

  useEffect(() => {
    saveActiveCustomerId(activeCustomerId);
  }, [activeCustomerId]);

  useEffect(() => {
    saveHosts(hosts);
  }, [hosts]);

  // Cloud sync when logged in via Google
  useEffect(() => {
    if (user) {
      loadDataFromCloud().then((cloudData) => {
        if (cloudData && cloudData.customers && cloudData.customers.length > 0) {
          setCustomers(cloudData.customers);
          if (cloudData.hosts && cloudData.hosts.length > 0) {
            setHosts(cloudData.hosts);
          }
        } else {
          syncDataToCloud({ customers, hosts });
        }
      });
    }
  }, [user?.userId]);

  // Auto-sync updates to cloud if logged in
  useEffect(() => {
    if (user) {
      const timer = setTimeout(() => {
        syncDataToCloud({ customers, hosts });
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [customers, hosts, user?.userId]);

  const handleSelectCustomer = (cust: Customer) => {
    setActiveCustomerId(cust.customer_id);
  };

  const handleUpdateCustomer = (updated: Customer) => {
    setCustomers((prev) =>
      prev.map((c) => (c.customer_id === updated.customer_id ? updated : c))
    );
    logAuditEvent('CUSTOMER_UPDATE', updated.customer_name, 'Regras e limiares do cliente atualizados.');
  };

  const handleCreateCustomer = (newCust: Customer) => {
    setCustomers((prev) => [newCust, ...prev]);
    setActiveCustomerId(newCust.customer_id);
    logAuditEvent('CUSTOMER_CREATE', newCust.customer_name, 'Novo cliente criado.');
  };

  const handleDeleteCustomer = (custId: string) => {
    const cust = customers.find((c) => c.customer_id === custId);
    const remaining = customers.filter((c) => c.customer_id !== custId);
    setCustomers(remaining);
    if (remaining.length > 0) {
      setActiveCustomerId(remaining[0].customer_id);
    }
    if (cust) {
      logAuditEvent('CUSTOMER_DELETE', cust.customer_name, 'Cliente removido.');
    }
  };

  const handleResetToDefault = () => {
    const data = resetToDefaultData();
    setCustomers(data.customers);
    setActiveCustomerId(data.activeCustomerId);
    setHosts(data.hosts);
    setPractices(PRACTICES_CATALOG);
    logAuditEvent('CUSTOMER_UPDATE', 'Sistema', 'Dados restaurados para o padrão.');
  };

  const handleWipeAllData = () => {
    wipeAllData();
    setCustomers([]);
    setActiveCustomerId('');
    setHosts([]);
    setPractices(PRACTICES_CATALOG);
    logAuditEvent('DATA_WIPE', 'Sistema', 'Limpeza geral da aplicação realizada.');
  };

  const handleSaveHosts = (updatedHosts: Host[]) => {
    setHosts(updatedHosts);
    logAuditEvent('HOST_CREATE', 'Inventário', `Inventário de hosts atualizado (${updatedHosts.length} hosts).`);
  };

  const handleNavigateToFactoryWithPractice = (practice: Practice) => {
    setPreselectedPracticeId(practice.id);
    setActiveTab('factory');
  };

  const handleOpenGuidanceWithTrigger = (trigger: GeneratedTrigger) => {
    setGuidanceTrigger(trigger);
    setIsGuidanceOpen(true);
  };

  const handleSelectHostForFactory = (hostId: string) => {
    setSelectedHostId(hostId);
    setActiveTab('factory');
  };

  const handleNavigateToSimulatorWithTrigger = (trigger: GeneratedTrigger) => {
    setPreselectedSimulatorTrigger(trigger);
    setActiveTab('simulator');
  };

  const handleImportData = (data: { customers: Customer[]; hosts: Host[] }) => {
    setCustomers(data.customers);
    setHosts(data.hosts);
    if (data.customers.length > 0) {
      setActiveCustomerId(data.customers[0].customer_id);
    }
  };

  const handleImportPractices = (newPractices: Practice[]) => {
    setPractices((prev) => {
      const existingIds = new Set(prev.map((p) => p.id));
      const toAdd = newPractices.filter((p) => !existingIds.has(p.id));
      return [...toAdd, ...prev];
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Bar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        customers={customers}
        activeCustomer={activeCustomer}
        onSelectCustomer={handleSelectCustomer}
        onOpenGuidance={() => {
          setGuidanceTrigger(null);
          setIsGuidanceOpen(true);
        }}
        onOpenLogin={() => setIsLoginModalOpen(true)}
      />

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {!activeCustomer ? (
          <div className="max-w-md mx-auto my-16 p-8 bg-slate-900 border border-slate-800 rounded-2xl text-center space-y-4 shadow-xl">
            <div className="w-12 h-12 rounded-full bg-rose-950/60 border border-rose-800/80 mx-auto flex items-center justify-center text-rose-500">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-bold text-white">Nenhum Cliente Configurado</h2>
              <p className="text-xs text-slate-400">
                A aplicação está vazia. Você pode restaurar os clientes padrão ou cadastrar um novo cliente.
              </p>
            </div>
            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={handleResetToDefault}
                className="w-full py-2.5 px-4 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Restaurar Clientes Padrão</span>
              </button>
              <button
                onClick={() => {
                  const newCust: Customer = {
                    customer_id: `cust-${Date.now()}`,
                    customer_name: 'Novo Cliente',
                    created_at: new Date().toISOString(),
                    business_rules: DEFAULT_CUSTOMER.business_rules,
                  };
                  handleCreateCustomer(newCust);
                  setActiveTab('client');
                }}
                className="w-full py-2 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs flex items-center justify-center gap-2 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Criar Novo Cliente</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="transition-all duration-150">
            {activeTab === 'overview' && (
              <OverviewView
                customer={activeCustomer}
                hosts={hosts}
                practices={practices}
                onNavigateTab={setActiveTab}
                onSelectCategoryFilter={(catId: string) => {
                  setSelectedCategory(catId);
                  setActiveTab('catalog');
                }}
              />
            )}

            {activeTab === 'compliance' && (
              <ComplianceDashboardView
                customer={activeCustomer}
                hosts={hosts}
                practices={practices}
                onNavigateToFactoryWithPractice={(practiceId: string, hostId?: string) => {
                  setPreselectedPracticeId(practiceId);
                  if (hostId) setSelectedHostId(hostId);
                  setActiveTab('factory');
                }}
                onNavigateToFactory={() => setActiveTab('factory')}
              />
            )}

            {activeTab === 'integrations' && (
              <IntegrationsView
                customer={activeCustomer}
                hosts={hosts}
                onImportPractices={handleImportPractices}
                onNavigateToFactoryWithPractice={handleNavigateToFactoryWithPractice}
              />
            )}

            {activeTab === 'validator' && (
              <RequirementValidatorView
                customer={activeCustomer}
                customers={customers}
                onSelectCustomer={handleSelectCustomer}
              />
            )}

            {activeTab === 'catalog' && (
              <CatalogView
                practices={practices}
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
                onNavigateToFactoryWithPractice={handleNavigateToFactoryWithPractice}
                onNavigateToIntegrations={() => setActiveTab('integrations')}
              />
            )}

            {activeTab === 'factory' && (
              <TriggerFactoryView
                customer={activeCustomer}
                hosts={hosts}
                practices={practices}
                selectedHostId={selectedHostId}
                setSelectedHostId={setSelectedHostId}
                onOpenGuidanceWithTrigger={handleOpenGuidanceWithTrigger}
                preselectedPracticeId={preselectedPracticeId}
                onNavigateToIntegrations={() => setActiveTab('integrations')}
                onNavigateToSimulator={handleNavigateToSimulatorWithTrigger}
              />
            )}

            {activeTab === 'audit' && (
              <TriggerAuditView
                onNavigateToFactory={(triggerName, expression) => {
                  setActiveTab('factory');
                }}
              />
            )}

            {activeTab === 'hosts' && (
              <HostInventoryView
                hosts={hosts}
                onSaveHosts={handleSaveHosts}
                onSelectHostForFactory={handleSelectHostForFactory}
              />
            )}

            {activeTab === 'client' && (
              <ClientManagerView
                customers={customers}
                activeCustomer={activeCustomer}
                onUpdateCustomer={handleUpdateCustomer}
                onCreateCustomer={handleCreateCustomer}
                onDeleteCustomer={handleDeleteCustomer}
                onResetToDefault={handleResetToDefault}
                onWipeAllData={handleWipeAllData}
              />
            )}

            {activeTab === 'simulator' && (
              <SyntaxSimulatorView
                customer={activeCustomer}
                practices={practices}
                hosts={hosts}
                preselectedTrigger={preselectedSimulatorTrigger}
                onClearPreselectedTrigger={() => setPreselectedSimulatorTrigger(null)}
              />
            )}

            {activeTab === 'security' && (
              <SecurityComplianceView
                customer={activeCustomer}
                customers={customers}
                hosts={hosts}
                onOpenLoginModal={() => setIsLoginModalOpen(true)}
              />
            )}

            {activeTab === 'docs' && (
              <DocumentationView
                customer={activeCustomer}
                customers={customers}
                hosts={hosts}
                practices={practices}
                onImportData={handleImportData}
              />
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 font-mono">
          <div>
            Zabbix Trigger Factory · Governança, Nuvem e LGPD (Lei nº 13.709/2018)
          </div>
          <div className="flex items-center gap-3">
            <span>Cliente: <strong className="text-slate-400">{activeCustomer ? activeCustomer.customer_name : 'Nenhum'}</strong></span>
            <button
              onClick={() => setActiveTab('security')}
              className="text-rose-400 hover:text-rose-300 flex items-center gap-1 font-sans"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Conformidade LGPD Ativa</span>
            </button>
          </div>
        </div>
      </footer>

      {/* Guidance Modal */}
      <ZabbixGuidanceModal
        isOpen={isGuidanceOpen}
        onClose={() => setIsGuidanceOpen(false)}
        trigger={guidanceTrigger}
      />

      {/* Google Login & LGPD Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onOpenSecurityOverview={() => setActiveTab('security')}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
