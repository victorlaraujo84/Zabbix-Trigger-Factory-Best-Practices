import { Customer, Host, Practice, HostTypeId, GeneratedTrigger } from '../types';
import { MONITORING_CATEGORIES } from '../data/categories';
import { generateTrigger } from './triggerGenerator';

export interface CategoryComplianceItem {
  categoryId: HostTypeId;
  categoryName: string;
  shortTitle: string;
  editalSection: string;
  recommendedCount: number;
  coveredCount: number;
  gapCount: number;
  coveragePct: number;
  hostCount: number;
  totalGeneratedTriggers: number;
  missingPractices: Practice[];
}

export interface ComplianceSummary {
  overallCoveragePct: number;
  totalCatalogPractices: number;
  totalCoveredPractices: number;
  totalCoverageGaps: number;
  totalHosts: number;
  totalGeneratedTriggers: number;
  categoriesWithGapsCount: number;
  fullyCoveredCategoriesCount: number;
  categoryData: CategoryComplianceItem[];
  radarData: Array<{
    subject: string;
    ativas: number;
    recomendadas: number;
    coberturaPct: number;
    fullMark: number;
  }>;
  allGeneratedTriggers: GeneratedTrigger[];
}

/**
 * Calculates comprehensive compliance analytics comparing active triggers vs catalog recommendations
 */
export function calculateComplianceAnalytics(
  customer: Customer,
  hosts: Host[],
  practices: Practice[]
): ComplianceSummary {
  // Generate all active triggers across all hosts
  const allGeneratedTriggers: GeneratedTrigger[] = [];
  hosts.forEach((host) => {
    const hostPractices = practices.filter((p) => p.category === host.host_type);
    hostPractices.forEach((practice) => {
      allGeneratedTriggers.push(
        generateTrigger(practice, host, customer, {
          useTemplateMacro: false,
          includeCriticalHoursCondition: false,
        })
      );
    });
  });

  const categoryData: CategoryComplianceItem[] = MONITORING_CATEGORIES.map((cat) => {
    const catPractices = practices.filter((p) => p.category === cat.id);
    const catHosts = hosts.filter((h) => h.host_type === cat.id);
    const recommendedCount = catPractices.length;

    // Identify which practices have at least one host configured
    let coveredCount = 0;
    const missingPractices: Practice[] = [];

    if (catHosts.length === 0) {
      // If there are no hosts of this category, all catalog practices in this category are gaps
      coveredCount = 0;
      missingPractices.push(...catPractices);
    } else {
      // If there are hosts, check coverage
      catPractices.forEach((practice) => {
        const isCovered = allGeneratedTriggers.some(
          (t) => t.practice_id === practice.id && catHosts.some((h) => h.host_id === t.host_id)
        );
        if (isCovered) {
          coveredCount++;
        } else {
          missingPractices.push(practice);
        }
      });
    }

    const gapCount = Math.max(0, recommendedCount - coveredCount);
    const coveragePct =
      recommendedCount > 0 ? Math.round((coveredCount / recommendedCount) * 100) : 100;

    const catGeneratedCount = allGeneratedTriggers.filter((t) =>
      catHosts.some((h) => h.host_id === t.host_id)
    ).length;

    return {
      categoryId: cat.id,
      categoryName: cat.name,
      shortTitle: cat.short_title,
      editalSection: cat.edital_section,
      recommendedCount,
      coveredCount,
      gapCount,
      coveragePct,
      hostCount: catHosts.length,
      totalGeneratedTriggers: catGeneratedCount,
      missingPractices,
    };
  });

  const totalCatalogPractices = practices.length;
  const totalCoveredPractices = categoryData.reduce((acc, c) => acc + c.coveredCount, 0);
  const totalCoverageGaps = categoryData.reduce((acc, c) => acc + c.gapCount, 0);

  const categoriesWithGapsCount = categoryData.filter((c) => c.gapCount > 0).length;
  const fullyCoveredCategoriesCount = categoryData.filter((c) => c.gapCount === 0 && c.recommendedCount > 0).length;

  const overallCoveragePct =
    totalCatalogPractices > 0
      ? Math.round((totalCoveredPractices / totalCatalogPractices) * 100)
      : 0;

  // Radar chart data: 6 to 10 key categories for clear polygonal visualization
  const radarData = categoryData.map((c) => ({
    subject: c.shortTitle,
    ativas: c.coveredCount,
    recomendadas: c.recommendedCount,
    coberturaPct: c.coveragePct,
    fullMark: 100,
  }));

  return {
    overallCoveragePct,
    totalCatalogPractices,
    totalCoveredPractices,
    totalCoverageGaps,
    totalHosts: hosts.length,
    totalGeneratedTriggers: allGeneratedTriggers.length,
    categoriesWithGapsCount,
    fullyCoveredCategoriesCount,
    categoryData,
    radarData,
    allGeneratedTriggers,
  };
}
