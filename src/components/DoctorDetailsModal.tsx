import { X, TrendingUp, TrendingDown, User, FileDown, Calendar, DollarSign, Percent, CreditCard, Receipt, Database } from 'lucide-react';
import { useMemo, useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import { supabase } from '../lib/supabase';

interface MedicalTransfer {
  id: string;
  date: string;
  option_type: string;
  category: string;
  description: string;
  amount: number;
  discount_percentage: number;
  discount_amount: number;
  net_amount: number;
  doctor_name: string;
  reference_month: string;
  payment_method: string;
  payment_discount_percentage: number;
  payment_discount_amount: number;
  expense_category: string | null;
  expense_amount: number;
}

interface Transaction {
  id: string;
  date: string;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  category: string;
  subcategory: string | null;
  reference_month: string | null;
}

type DoctorDetailsModalProps = {
  onClose: () => void;
  doctorName: string;
  transfers: MedicalTransfer[];
  selectedMonth?: string;
};

// Mapeamentos fora do componente para evitar referências cíclicas
const optionTypeLabels: Record<string, string> = {
  option1: 'Procedimentos Básicos',
  option2: 'Procedimentos Especiais',
  option3: 'Hospitais'
};

const optionTypeDiscounts: Record<string, string> = {
  option1: '16,33%',
  option2: '10,93%',
  option3: '10,93%'
};

const expenseCategoryLabels: Record<string, string> = {
  rateio_mensal: 'Rateio Mensal',
  medicacao: 'Medicação',
  insumo: 'Insumo',
  outros: 'Outros',
  // Categorias da tabela transactions
  fixed: 'Despesa Fixa',
  variable: 'Despesa Variável',
  repasse_medico: 'Repasse Médico',
  imposto: 'Imposto',
  adiantamento: 'Adiantamento',
  fatura: 'Fatura',
  investimentos: 'Investimentos'
};

const paymentMethodLabels: Record<string, string> = {
  cash: 'Dinheiro',
  pix: 'PIX',
  debit_card: 'Cartão de Débito',
  credit_card: 'Cartão de Crédito'
};

const getExpenseSourceLabel = (source: string) => {
  return source === 'medical_transfer' ? 'Associada a Repasse' : 'Despesa Independente';
};

export function DoctorDetailsModal({ onClose, doctorName, transfers, selectedMonth }: DoctorDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<'summary' | 'incomes' | 'expenses'>('summary');
  const [independentExpenses, setIndependentExpenses] = useState<Transaction[]>([]);
  const [loadingExpenses, setLoadingExpenses] = useState(true);

  // Carregar despesas independentes do médico
  useEffect(() => {
    const fetchIndependentExpenses = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', user.id)
          .eq('type', 'expense')
          .eq('subcategory', doctorName)
          .order('date', { ascending: false });

        if (error) throw error;

        if (data) {
          setIndependentExpenses(data as Transaction[]);
        }
      } catch (error) {
        console.error('Erro ao buscar despesas independentes:', error);
      } finally {
        setLoadingExpenses(false);
      }
    };

    fetchIndependentExpenses();
  }, [doctorName]);

  const doctorTransfers = useMemo(() => {
    let filtered = transfers.filter(t => t.doctor_name === doctorName);

    if (selectedMonth) {
      filtered = filtered.filter(t => t.reference_month === selectedMonth);
    }

    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transfers, doctorName, selectedMonth]);

  // Filtrar despesas independentes por mês se necessário
  const filteredIndependentExpenses = useMemo(() => {
    if (!selectedMonth) return independentExpenses;
    return independentExpenses.filter(t => 
      t.reference_month === selectedMonth || 
      (!t.reference_month && t.date.startsWith(selectedMonth))
    );
  }, [independentExpenses, selectedMonth]);

  // Entradas: todas as transações de medical_transfers (opções 1, 2, 3)
  const incomeTransfers = useMemo(() => {
    return doctorTransfers.filter(t => t.option_type !== 'expense');
  }, [doctorTransfers]);

  // Despesas associadas aos repasses médicos
  const transferExpenses = useMemo(() => {
    const expenses: Array<{
      id: string;
      date: string;
      reference_month: string;
      description: string;
      amount: number;
      category: string | null;
      expense_category: string | null;
      parent_transfer_id: string;
      parent_transfer_type: string;
      parent_transfer_description: string;
      source: 'medical_transfer';
    }> = [];

    doctorTransfers.forEach(t => {
      if (t.expense_amount > 0 && t.expense_category) {
        expenses.push({
          id: `transfer-expense-${t.id}`,
          date: t.date,
          reference_month: t.reference_month,
          description: t.description || 'Despesa associada ao repasse',
          amount: t.expense_amount,
          category: t.category,
          expense_category: t.expense_category,
          parent_transfer_id: t.id,
          parent_transfer_type: t.option_type,
          parent_transfer_description: `${optionTypeLabels[t.option_type]} - ${t.category}`,
          source: 'medical_transfer'
        });
      }
    });

    return expenses;
  }, [doctorTransfers]);

  // Despesas independentes da tabela transactions
  const independentExpenseDetails = useMemo(() => {
    return filteredIndependentExpenses.map(t => ({
      id: `independent-${t.id}`,
      date: t.date,
      reference_month: t.reference_month || t.date.substring(0, 7),
      description: t.description,
      amount: t.amount,
      category: t.category,
      expense_category: t.subcategory || 'outros',
      source: 'transaction' as const,
      transaction_id: t.id
    }));
  }, [filteredIndependentExpenses]);

  // Todas as despesas combinadas
  const allExpenses = useMemo(() => {
    return [...transferExpenses, ...independentExpenseDetails]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transferExpenses, independentExpenseDetails]);

  // Cálculos atualizados incluindo ambas as fontes
  const totals = useMemo(() => {
    // Entradas: net_amount de todas as transações médicas (opções 1, 2, 3)
    const income = incomeTransfers.reduce((acc, t) => acc + (Number(t.net_amount) || 0), 0);
    
    // Despesas de repasses médicos
    const transferExpenseTotal = transferExpenses.reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
    
    // Despesas independentes
    const independentExpenseTotal = independentExpenseDetails.reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
    
    // Total geral de despesas
    const totalExpenses = transferExpenseTotal + independentExpenseTotal;
    
    // Saldo líquido: entradas líquidas - todas as despesas
    const balance = income - totalExpenses;
    
    return { 
      income, 
      transferExpenses: transferExpenseTotal,
      independentExpenses: independentExpenseTotal,
      totalExpenses,
      balance,
      grossIncome: incomeTransfers.reduce((acc, t) => acc + (Number(t.amount) || 0), 0),
      totalDiscounts: incomeTransfers.reduce((acc, t) => 
        acc + (Number(t.discount_amount) || 0) + (Number(t.payment_discount_amount) || 0), 0)
    };
  }, [incomeTransfers, transferExpenses, independentExpenseDetails]);

  // Agrupamento de entradas por tipo
  const incomesByType = useMemo(() => {
    const grouped: Record<string, { 
      transactions: MedicalTransfer[], 
      total: number, 
      totalGross: number, 
      totalDiscounts: number,
      totalTransferExpenses: number,
      netTotal: number,
      count: number 
    }> = {};

    incomeTransfers.forEach(t => {
      const type = t.option_type;
      if (!grouped[type]) {
        grouped[type] = { 
          transactions: [], 
          total: 0, 
          totalGross: 0, 
          totalDiscounts: 0,
          totalTransferExpenses: 0,
          netTotal: 0,
          count: 0 
        };
      }
      grouped[type].transactions.push(t);
      grouped[type].totalGross += t.amount;
      grouped[type].totalDiscounts += t.discount_amount + t.payment_discount_amount;
      grouped[type].totalTransferExpenses += t.expense_amount || 0;
      grouped[type].netTotal += t.net_amount - (t.expense_amount || 0);
      grouped[type].total += t.net_amount;
      grouped[type].count++;
    });

    return grouped;
  }, [incomeTransfers]);

  // Agrupamento de TODAS as despesas por categoria
  const expensesByCategory = useMemo(() => {
    const grouped: Record<string, { 
      transactions: typeof allExpenses, 
      total: number,
      transferCount: number,
      independentCount: number,
      count: number 
    }> = {};

    allExpenses.forEach(t => {
      const category = t.expense_category || 'outros';
      if (!grouped[category]) {
        grouped[category] = { 
          transactions: [], 
          total: 0,
          transferCount: 0,
          independentCount: 0,
          count: 0 
        };
      }
      grouped[category].transactions.push(t);
      grouped[category].total += (Number(t.amount) || 0);
      grouped[category].count++;
      
      if (t.source === 'medical_transfer') {
        grouped[category].transferCount++;
      } else {
        grouped[category].independentCount++;
      }
    });

    return grouped;
  }, [allExpenses]);

  // Breakdwon mensal atualizado com ambas as fontes
  const monthlyBreakdown = useMemo(() => {
    const months: Record<string, { 
      incomes: number, 
      transferExpenses: number,
      independentExpenses: number,
      totalExpenses: number,
      balance: number,
      incomeCount: number,
      expenseCount: number,
      grossIncome: number,
      totalDiscounts: number
    }> = {};

    // Processar entradas de repasses médicos
    incomeTransfers.forEach(t => {
      const month = t.reference_month;
      if (!months[month]) {
        months[month] = { 
          incomes: 0, 
          transferExpenses: 0,
          independentExpenses: 0,
          totalExpenses: 0,
          balance: 0,
          incomeCount: 0,
          expenseCount: 0,
          grossIncome: 0,
          totalDiscounts: 0
        };
      }

      months[month].incomes += Number(t.net_amount) || 0;
      months[month].grossIncome += Number(t.amount) || 0;
      months[month].totalDiscounts += (Number(t.discount_amount) || 0) + (Number(t.payment_discount_amount) || 0);
      months[month].incomeCount++;
      
      // Despesas associadas aos repasses
      if (t.expense_amount > 0) {
        months[month].transferExpenses += Number(t.expense_amount) || 0;
        months[month].expenseCount++;
      }
    });

    // Processar despesas independentes
    filteredIndependentExpenses.forEach(t => {
      const month = t.reference_month || t.date.substring(0, 7);
      if (!months[month]) {
        months[month] = { 
          incomes: 0, 
          transferExpenses: 0,
          independentExpenses: 0,
          totalExpenses: 0,
          balance: 0,
          incomeCount: 0,
          expenseCount: 0,
          grossIncome: 0,
          totalDiscounts: 0
        };
      }
      
      months[month].independentExpenses += Number(t.amount) || 0;
      months[month].expenseCount++;
    });

    // Calcular totais e saldos
    Object.keys(months).forEach(month => {
      months[month].totalExpenses = months[month].transferExpenses + months[month].independentExpenses;
      months[month].balance = months[month].incomes - months[month].totalExpenses;
    });

    return Object.entries(months)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([month, data]) => ({ month, ...data }));
  }, [incomeTransfers, filteredIndependentExpenses]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (date: string) => {
    return new Date(date + 'T00:00:00').toLocaleDateString('pt-BR');
  };

  const formatMonth = (month: string) => {
    const [year, monthNum] = month.split('-');
    const date = new Date(parseInt(year), parseInt(monthNum) - 1);
    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  };

  const formatMonthShort = (month: string) => {
    const [year, monthNum] = month.split('-');
    const date = new Date(parseInt(year), parseInt(monthNum) - 1);
    return date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
  };

  // Mapeamentos para uso dentro do componente
  const paymentMethodIcons: Record<string, React.ReactNode> = {
    cash: <DollarSign size={14} />,
    pix: <span className="text-xs">PIX</span>,
    debit_card: <CreditCard size={14} />,
    credit_card: <CreditCard size={14} />
  };

 const generatePDF = () => {
  // Configurar PDF em modo paisagem (landscape)
  const doc = new jsPDF('landscape');
  const pageWidth = doc.internal.pageSize.getWidth(); // 297mm em paisagem
  const pageHeight = doc.internal.pageSize.getHeight(); // 210mm em paisagem
  const margin = 20;
  const lineHeight = 6;
  let yPosition = margin;

  // Função para verificar se precisa de nova página
  const checkPageBreak = (neededSpace: number) => {
    if (yPosition + neededSpace > pageHeight - margin) {
      doc.addPage('landscape');
      yPosition = margin;
      return true;
    }
    return false;
  };

  // Título
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  const title = 'RELATÓRIO DE REPASSES MÉDICOS';
  doc.text(title, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 10;

  // Médico
  doc.setFontSize(14);
  doc.text(`Médico: ${doctorName}`, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 8;

  // Período
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  const periodText = selectedMonth ? 
    `Período: ${formatMonth(selectedMonth)}` : 
    'Período: Todos os meses';
  doc.text(periodText, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 15;

  // Seção de Resumo Financeiro com layout lado a lado
  checkPageBreak(30);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('RESUMO FINANCEIRO', margin, yPosition);
  yPosition += 8;

  // Primeira coluna (esquerda)
  const firstColumnX = margin;
  const secondColumnX = pageWidth / 2;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  
  // Coluna esquerda
  doc.text(`Valor Bruto Total: ${formatCurrency(totals.grossIncome)}`, firstColumnX, yPosition);
  yPosition += lineHeight;
  doc.text(`Total de Descontos: -${formatCurrency(totals.totalDiscounts)}`, firstColumnX, yPosition);
  yPosition += lineHeight;
  doc.text(`Entradas Líquidas: ${formatCurrency(totals.income)} (${incomeTransfers.length} repasses)`, firstColumnX, yPosition);
  yPosition += lineHeight;
  doc.text(`Despesas de Repasses: -${formatCurrency(totals.transferExpenses)} (${transferExpenses.length})`, firstColumnX, yPosition);
  
  // Coluna direita
  const rightColumnY = yPosition - (3 * lineHeight);
  doc.text(`Despesas Independentes: -${formatCurrency(totals.independentExpenses)} (${independentExpenseDetails.length})`, secondColumnX, rightColumnY);
  doc.text(`Total de Despesas: -${formatCurrency(totals.totalExpenses)} (${allExpenses.length})`, secondColumnX, rightColumnY + lineHeight);
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`SALDO FINAL: ${formatCurrency(totals.balance)}`, secondColumnX, rightColumnY + (2 * lineHeight));
  
  yPosition += lineHeight * 2;
  yPosition += 15;

  // Entradas por tipo com colunas mais largas (paisagem)
  if (incomeTransfers.length > 0) {
    checkPageBreak(25);
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('ENTRADAS POR TIPO DE PROCEDIMENTO', margin, yPosition);
    yPosition += 10;
    
    // Configurar larguras das colunas para paisagem
    const colWidths = [80, 20, 45, 45, 50, 45]; // Mais espaço em paisagem
    const colPositions = [
      margin,
      margin + colWidths[0],
      margin + colWidths[0] + colWidths[1],
      margin + colWidths[0] + colWidths[1] + colWidths[2],
      margin + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3],
      margin + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4]
    ];
    
    // Cabeçalho da tabela
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('TIPO DE PROCEDIMENTO', colPositions[0], yPosition);
    doc.text('QTD', colPositions[1], yPosition);
    doc.text('VALOR BRUTO', colPositions[2], yPosition);
    doc.text('DESCONTOS', colPositions[3], yPosition);
    doc.text('DESP. ASSOCIADAS', colPositions[4], yPosition);
    doc.text('VALOR LÍQUIDO', colPositions[5], yPosition);
    
    yPosition += 8;
    doc.setLineWidth(0.2);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 6;
    
    // Conteúdo da tabela
    doc.setFont('helvetica', 'normal');
    Object.entries(incomesByType).forEach(([type, data]) => {
      checkPageBreak(10);
      
      // Tipo completo (mais espaço em paisagem)
      const typeLabel = optionTypeLabels[type] || type;
      doc.text(typeLabel, colPositions[0], yPosition);
      
      // Qtd
      doc.text(data.count.toString(), colPositions[1] + 5, yPosition, { align: 'center' });
      
      // Bruto
      doc.text(formatCurrency(data.totalGross), colPositions[2], yPosition);
      
      // Descontos
      doc.text(formatCurrency(data.totalDiscounts), colPositions[3], yPosition);
      
      // Despesas Associadas
      doc.text(formatCurrency(data.totalTransferExpenses), colPositions[4], yPosition);
      
      // Líquido
      doc.text(formatCurrency(data.netTotal), colPositions[5], yPosition);
      
      yPosition += 10;
    });
    
    yPosition += 15;
  }

  // Tabela de Despesas por Categoria (mais espaçosa em paisagem)
  if (allExpenses.length > 0) {
    checkPageBreak(30);
    
    // Usar layout de duas colunas lado a lado para despesas
    const leftSectionWidth = (pageWidth - (3 * margin)) / 2;
    const rightSectionX = margin + leftSectionWidth + margin;
    
    // Título
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('DESPESAS POR CATEGORIA', margin, yPosition);
    yPosition += 10;
    
    // Configurações de coluna para cada seção
    const categoryColWidths = [60, 30, 40]; // Categoria, Qtd, Total
    const detailColWidths = [100, 40]; // Descrição, Valor
    
    // Cabeçalho da seção de resumo
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('RESUMO POR CATEGORIA', margin, yPosition);
    yPosition += 6;
    
    // Linha divisória
    doc.setLineWidth(0.1);
    doc.line(margin, yPosition, margin + leftSectionWidth, yPosition);
    yPosition += 6;
    
    // Conteúdo do resumo por categoria
    doc.setFont('helvetica', 'normal');
    Object.entries(expensesByCategory).forEach(([category, data]) => {
      checkPageBreak(8);
      
      const categoryY = yPosition;
      
      // Categoria
      const categoryLabel = expenseCategoryLabels[category] || category;
      doc.text(categoryLabel, margin, categoryY);
      
      // Quantidade com origem
      const qtdText = `${data.count} (${data.transferCount}R/${data.independentCount}I)`;
      doc.text(qtdText, margin + categoryColWidths[0], categoryY);
      
      // Total
      doc.text(formatCurrency(data.total), margin + categoryColWidths[0] + categoryColWidths[1], categoryY);
      
      yPosition += 8;
    });
    
    // Resetar Y para detalhes à direita
    yPosition = margin + 40; // Posição inicial para detalhes
    
    // Título da seção de detalhes
    doc.setFont('helvetica', 'bold');
    doc.text('DETALHES DAS DESPESAS', rightSectionX, yPosition);
    yPosition += 8;
    
    // Linha divisória
    doc.line(rightSectionX, yPosition, pageWidth - margin, yPosition);
    yPosition += 6;
    
    // Detalhes das despesas
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    
    // Agrupar todas as despesas por tipo
    const allExpensesList = allExpenses.slice(0, 15); // Limitar para caber
    
    allExpensesList.forEach((expense, index) => {
      if (yPosition + 8 > pageHeight - margin) {
        // Se não couber nesta página, criar nova página
        doc.addPage('landscape');
        yPosition = margin + 20;
        doc.setFontSize(9);
      }
      
      const prefix = expense.source === 'medical_transfer' ? '🔄' : '💳';
      const sourceAbbr = expense.source === 'medical_transfer' ? '(R)' : '(I)';
      const desc = expense.description.length > 40 ? 
        expense.description.substring(0, 40) + '...' : expense.description;
      
      doc.text(`${prefix} ${desc} ${sourceAbbr}`, rightSectionX, yPosition);
      doc.text(formatCurrency(expense.amount), rightSectionX + detailColWidths[0], yPosition);
      
      yPosition += 7;
    });
    
    if (allExpenses.length > 15) {
      doc.text(`... e mais ${allExpenses.length - 15} despesas`, rightSectionX, yPosition);
      yPosition += 7;
    }
    
    yPosition = Math.max(yPosition, margin + 40 + (Object.keys(expensesByCategory).length * 8) + 20);
  }

  // Detalhamento por Mês com tabela completa
  if (monthlyBreakdown.length > 0) {
    checkPageBreak(40);
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('DETALHAMENTO POR MÊS', margin, yPosition);
    yPosition += 10;
    
    // Colunas ajustadas para paisagem
    const monthColWidths = [40, 55, 45, 45, 50, 50]; // Mais espaço em paisagem
    const monthColPositions = [
      margin,
      margin + monthColWidths[0],
      margin + monthColWidths[0] + monthColWidths[1],
      margin + monthColWidths[0] + monthColWidths[1] + monthColWidths[2],
      margin + monthColWidths[0] + monthColWidths[1] + monthColWidths[2] + monthColWidths[3],
      margin + monthColWidths[0] + monthColWidths[1] + monthColWidths[2] + monthColWidths[3] + monthColWidths[4]
    ];
    
    // Cabeçalho completo
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('MÊS', monthColPositions[0], yPosition);
    doc.text('ENTRADAS LÍQUIDAS', monthColPositions[1], yPosition);
    doc.text('DESP. REPASSES', monthColPositions[2], yPosition);
    doc.text('DESP. INDEP.', monthColPositions[3], yPosition);
    doc.text('TOTAL DESPESAS', monthColPositions[4], yPosition);
    doc.text('SALDO FINAL', monthColPositions[5], yPosition);
    
    yPosition += 8;
    doc.setLineWidth(0.2);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 6;
    
    // Conteúdo
    doc.setFont('helvetica', 'normal');
    monthlyBreakdown.forEach(({ month, incomes, transferExpenses, independentExpenses, totalExpenses, balance, incomeCount }) => {
      checkPageBreak(10);
      
      // Mês completo
      const monthText = formatMonthShort(month);
      doc.text(monthText, monthColPositions[0], yPosition);
      
      // Entradas com contador
      const incomeText = formatCurrency(incomes);
      doc.text(incomeText, monthColPositions[1], yPosition);
      doc.setFontSize(8);
      doc.text(`${incomeCount} trans.`, monthColPositions[1], yPosition + 4);
      doc.setFontSize(10);
      
      // Despesas de Repasses
      doc.text(formatCurrency(transferExpenses), monthColPositions[2], yPosition);
      
      // Despesas Independentes
      doc.text(formatCurrency(independentExpenses), monthColPositions[3], yPosition);
      
      // Total Despesas
      doc.text(formatCurrency(totalExpenses), monthColPositions[4], yPosition);
      
      // Saldo com cor condicional
      const originalColor = doc.getTextColor();
      if (balance >= 0) {
        doc.setTextColor(0, 128, 0); // Verde
      } else {
        doc.setTextColor(255, 0, 0); // Vermelho
      }
      doc.text(formatCurrency(balance), monthColPositions[5], yPosition);
      doc.setTextColor(originalColor);
      
      yPosition += 12;
    });
  }

  // Gráfico de barras simples para visualização (opcional)
  if (monthlyBreakdown.length > 0 && monthlyBreakdown.length <= 12) {
    checkPageBreak(60);
    
    yPosition += 10;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('VISUALIZAÇÃO POR MÊS', margin, yPosition);
    yPosition += 15;
    
    // Configurações do gráfico
    const chartWidth = pageWidth - (2 * margin);
    const chartHeight = 50;
    const chartX = margin;
    const chartY = yPosition;
    const barWidth = (chartWidth / monthlyBreakdown.length) * 0.7;
    const maxValue = Math.max(...monthlyBreakdown.map(m => Math.max(m.incomes, m.totalExpenses)));
    const scale = chartHeight / maxValue;
    
    // Desenhar eixos
    doc.setLineWidth(0.5);
    doc.line(chartX, chartY, chartX, chartY + chartHeight); // Eixo Y
    doc.line(chartX, chartY + chartHeight, chartX + chartWidth, chartY + chartHeight); // Eixo X
    
    // Desenhar barras
    monthlyBreakdown.forEach((monthData, index) => {
      const barX = chartX + (index * (chartWidth / monthlyBreakdown.length)) + 5;
      
      // Barra de entradas (verde)
      const incomeHeight = monthData.incomes * scale;
      doc.setFillColor(0, 128, 0);
      doc.rect(barX, chartY + chartHeight - incomeHeight, barWidth * 0.4, incomeHeight, 'F');
      
      // Barra de despesas (vermelho)
      const expenseHeight = monthData.totalExpenses * scale;
      doc.setFillColor(255, 0, 0);
      doc.rect(barX + barWidth * 0.4, chartY + chartHeight - expenseHeight, barWidth * 0.4, expenseHeight, 'F');
      
      // Nome do mês (abreviado)
      const monthLabel = monthData.month.split('-')[1] + '/' + monthData.month.split('-')[0].slice(2);
      doc.setFontSize(8);
      doc.text(monthLabel, barX + barWidth * 0.2, chartY + chartHeight + 5);
    });
    
    // Legenda
    yPosition += chartHeight + 20;
    doc.setFontSize(9);
    doc.setFillColor(0, 128, 0);
    doc.rect(margin, yPosition, 8, 8, 'F');
    doc.text('Entradas', margin + 12, yPosition + 6);
    
    doc.setFillColor(255, 0, 0);
    doc.rect(margin + 60, yPosition, 8, 8, 'F');
    doc.text('Despesas', margin + 72, yPosition + 6);
  }

  // Rodapé em todas as páginas
  const pageCount = doc.getNumberOfPages();
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const footerY = pageHeight - 10;
    
    // Linha divisória do rodapé
    doc.setLineWidth(0.1);
    doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);
    
    // Número da página
    doc.text(`Página ${i} de ${pageCount}`, pageWidth / 2, footerY, { align: 'center' });
    
    // Data de geração
    const genDate = new Date().toLocaleDateString('pt-BR');
    const genTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    doc.text(`Gerado em: ${genDate} ${genTime}`, margin, footerY);
    
    // Médico
    const doctorShort = doctorName.length > 25 ? doctorName.substring(0, 25) + '...' : doctorName;
    doc.text(`Médico: ${doctorShort}`, pageWidth - margin - 80, footerY);
  }

  // Salvar PDF
  const safeDoctorName = doctorName.replace(/[^\w\s]/gi, '').replace(/\s+/g, '_');
  const safeMonth = selectedMonth ? selectedMonth.replace(/-/g, '_') : 'Todos';
  const fileName = `Repasse_${safeDoctorName}_${safeMonth}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);
};
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-6 border-b">
          <div className="flex items-center gap-3">
            <User className="text-blue-600" size={28} />
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Detalhamento do Médico</h2>
              <p className="text-gray-600">{doctorName}</p>
              {selectedMonth ? (
                <p className="text-sm text-gray-500 capitalize">{formatMonth(selectedMonth)}</p>
              ) : (
                <p className="text-sm text-gray-500">Todos os períodos</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={generatePDF}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition font-medium"
              title="Gerar PDF"
            >
              <FileDown size={20} />
              Gerar PDF
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition p-2"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b px-6">
          <div className="flex space-x-4">
            <button
              onClick={() => setActiveTab('summary')}
              className={`py-3 px-4 font-medium border-b-2 transition-colors ${activeTab === 'summary' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              Resumo
            </button>
            <button
              onClick={() => setActiveTab('incomes')}
              className={`py-3 px-4 font-medium border-b-2 transition-colors ${activeTab === 'incomes' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              Entradas ({incomeTransfers.length})
            </button>
            <button
              onClick={() => setActiveTab('expenses')}
              className={`py-3 px-4 font-medium border-b-2 transition-colors ${activeTab === 'expenses' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              Despesas ({allExpenses.length})
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {/* Cards de Resumo atualizados */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Valor Bruto</span>
                <Receipt className="text-gray-600" size={20} />
              </div>
              <p className="text-2xl font-bold text-gray-800">{formatCurrency(totals.grossIncome)}</p>
              <p className="text-xs text-gray-500 mt-1">{incomeTransfers.length} repasses</p>
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-orange-700">Total Descontos</span>
                <Percent className="text-orange-600" size={20} />
              </div>
              <p className="text-2xl font-bold text-orange-600">-{formatCurrency(totals.totalDiscounts)}</p>
              <p className="text-xs text-orange-600 mt-1">NF + Pagamento</p>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-green-700">Entradas Líquidas</span>
                <TrendingUp className="text-green-600" size={20} />
              </div>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(totals.income)}</p>
              <p className="text-xs text-green-600 mt-1">Após descontos</p>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-red-700">Total Despesas</span>
                <TrendingDown className="text-red-600" size={20} />
              </div>
              <p className="text-2xl font-bold text-red-600">-{formatCurrency(totals.totalExpenses)}</p>
              <div className="text-xs text-red-600 mt-1 space-y-1">
                <p>Repasses: {transferExpenses.length}</p>
                <p>Independentes: {independentExpenseDetails.length}</p>
              </div>
            </div>

            <div className={`border rounded-lg p-4 ${totals.balance >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-red-50 border-red-200'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-sm font-medium ${totals.balance >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
                  Saldo Final
                </span>
                <DollarSign className={totals.balance >= 0 ? 'text-blue-600' : 'text-red-600'} size={20} />
              </div>
              <p className={`text-2xl font-bold ${totals.balance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                {formatCurrency(totals.balance)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {allExpenses.length} despesa(s)
              </p>
            </div>
          </div>

          {/* Conteúdo das Tabs */}
          {activeTab === 'summary' && (
            <div className="space-y-6">
              {/* Breakdown por Mês */}
              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Calendar className="text-blue-600" size={20} />
                  Desempenho por Mês
                </h3>
                {monthlyBreakdown.length > 0 ? (
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">Mês</th>
                          <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">Entradas</th>
                          <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">Desp. Repasses</th>
                          <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">Desp. Indep.</th>
                          <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">Saldo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {monthlyBreakdown.map(({ month, incomes, transferExpenses, independentExpenses, balance, incomeCount }) => (
                          <tr key={month} className="hover:bg-gray-50">
                            <td className="py-3 px-4">
                              <span className="font-medium">{formatMonthShort(month)}</span>
                            </td>
                            <td className="py-3 px-4">
                              <div>
                                <p className="font-medium text-green-600">{formatCurrency(incomes)}</p>
                                <p className="text-xs text-gray-500">{incomeCount} repasse(s)</p>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div>
                                <p className="font-medium text-orange-600">{formatCurrency(transferExpenses)}</p>
                                <p className="text-xs text-gray-500">Associadas</p>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div>
                                <p className="font-medium text-red-600">{formatCurrency(independentExpenses)}</p>
                                <p className="text-xs text-gray-500">Independentes</p>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`font-bold ${balance >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                                {formatCurrency(balance)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                    <p className="text-gray-500">Nenhum dado disponível para o período selecionado</p>
                  </div>
                )}
              </div>

              {/* Resumo por Tipo atualizado */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Entradas por Tipo */}
                <div>
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Entradas por Tipo</h3>
                  {Object.keys(incomesByType).length > 0 ? (
                    <div className="space-y-4">
                      {Object.entries(incomesByType).map(([type, data]) => (
                        <div key={type} className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <div className="flex justify-between items-center mb-3">
                            <div>
                              <h4 className="font-semibold text-green-800">
                                {optionTypeLabels[type]}
                              </h4>
                              <p className="text-sm text-green-600">Desconto: {optionTypeDiscounts[type]}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-green-600">{formatCurrency(data.netTotal)}</p>
                              <p className="text-xs text-green-600">{data.count} transação(ões)</p>
                            </div>
                          </div>
                          <div className="bg-white rounded p-3 text-sm space-y-2">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Valor Bruto:</span>
                              <span className="font-medium">{formatCurrency(data.totalGross)}</span>
                            </div>
                            <div className="flex justify-between text-red-600">
                              <span>Total Descontos:</span>
                              <span className="font-medium">-{formatCurrency(data.totalDiscounts)}</span>
                            </div>
                            {data.totalTransferExpenses > 0 && (
                              <div className="flex justify-between text-orange-600">
                                <span>Despesas Associadas:</span>
                                <span className="font-medium">-{formatCurrency(data.totalTransferExpenses)}</span>
                              </div>
                            )}
                            <div className="flex justify-between text-green-700 font-semibold border-t pt-2">
                              <span>Valor Líquido Final:</span>
                              <span>{formatCurrency(data.netTotal)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                      <p className="text-gray-500">Nenhuma entrada registrada</p>
                    </div>
                  )}
                </div>

                {/* Despesas por Categoria */}
                <div>
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Despesas por Categoria</h3>
                  {Object.keys(expensesByCategory).length > 0 ? (
                    <div className="space-y-4">
                      {Object.entries(expensesByCategory).map(([category, data]) => (
                        <div key={category} className="bg-red-50 border border-red-200 rounded-lg p-4">
                          <div className="flex justify-between items-center mb-3">
                            <div>
                              <h4 className="font-semibold text-red-800">
                                {expenseCategoryLabels[category] || category}
                              </h4>
                              <div className="flex gap-2 text-xs text-red-600">
                                {data.transferCount > 0 && (
                                  <span className="bg-red-100 px-2 py-1 rounded">Repasses: {data.transferCount}</span>
                                )}
                                {data.independentCount > 0 && (
                                  <span className="bg-red-100 px-2 py-1 rounded">Indep: {data.independentCount}</span>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-red-600">{formatCurrency(data.total)}</p>
                              <p className="text-xs text-red-600">{data.count} transação(ões)</p>
                            </div>
                          </div>
                          <div className="space-y-2">
                            {data.transactions.slice(0, 3).map((t) => (
                              <div key={t.id} className="bg-white rounded p-3 text-sm">
                                <div className="flex justify-between items-start">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className={`text-xs px-2 py-1 rounded ${
                                        t.source === 'medical_transfer' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                                      }`}>
                                        {getExpenseSourceLabel(t.source)}
                                      </span>
                                    </div>
                                    <p className="font-medium text-gray-800">{t.description}</p>
                                    <p className="text-xs text-gray-500">{formatDate(t.date)}</p>
                                    {t.source === 'medical_transfer' && (
                                      <p className="text-xs text-blue-600 mt-1">
                                        Repasse: {(t as any).parent_transfer_description}
                                      </p>
                                    )}
                                  </div>
                                  <span className="font-semibold text-red-600 ml-2">
                                    {formatCurrency(t.amount)}
                                  </span>
                                </div>
                              </div>
                            ))}
                            {data.transactions.length > 3 && (
                              <p className="text-center text-xs text-gray-500 py-2">
                                ... e mais {data.transactions.length - 3} transações
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                      <p className="text-gray-500">Nenhuma despesa registrada</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'incomes' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-800">Detalhamento de Entradas</h3>
                <span className="text-sm text-gray-500">
                  {incomeTransfers.length} repasse(s) • 
                  {transferExpenses.length > 0 && ` ${transferExpenses.length} com despesa associada`}
                </span>
              </div>
              
              {incomeTransfers.length > 0 ? (
                <div className="space-y-4">
                  {incomeTransfers.map((t) => (
                    <div key={t.id} className={`bg-white border rounded-lg p-4 hover:shadow-sm transition-shadow ${
                      t.expense_amount > 0 ? 'border-orange-200 bg-orange-50' : 'border-gray-200'
                    }`}>
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-blue-600">
                              {optionTypeLabels[t.option_type]}
                            </span>
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                              {t.category}
                            </span>
                            <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded flex items-center gap-1">
                              {paymentMethodIcons[t.payment_method]}
                              {paymentMethodLabels[t.payment_method]}
                            </span>
                            {t.expense_amount > 0 && (
                              <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded flex items-center gap-1">
                                <TrendingDown size={12} />
                                Com despesa
                              </span>
                            )}
                          </div>
                          <p className="text-gray-800">{t.description || 'Sem descrição'}</p>
                          <p className="text-sm text-gray-500">{formatDate(t.date)} • Ref: {formatMonthShort(t.reference_month)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold text-green-600">{formatCurrency(t.net_amount)}</p>
                          <p className="text-sm text-gray-500">Líquido</p>
                          {t.expense_amount > 0 && (
                            <p className="text-xs text-red-600 font-medium mt-1">
                              -{formatCurrency(t.expense_amount)} em despesas
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="bg-white rounded-lg p-3 space-y-3 text-sm border">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <div className="flex justify-between mb-1">
                              <span className="text-gray-600">Valor Bruto:</span>
                              <span className="font-medium">{formatCurrency(t.amount)}</span>
                            </div>
                            <div className="flex justify-between mb-1">
                              <span className="text-gray-600">Desconto NF ({t.discount_percentage}%):</span>
                              <span className="text-red-600 font-medium">-{formatCurrency(t.discount_amount)}</span>
                            </div>
                            {t.payment_discount_amount > 0 && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">Desconto Pagamento ({t.payment_discount_percentage}%):</span>
                                <span className="text-red-600 font-medium">-{formatCurrency(t.payment_discount_amount)}</span>
                              </div>
                            )}
                          </div>
                          <div className="md:border-l md:pl-4">
                            <div className="flex justify-between mb-1">
                              <span className="text-gray-600">Total Descontos:</span>
                              <span className="text-red-600 font-bold">
                                -{formatCurrency(t.discount_amount + t.payment_discount_amount)}
                              </span>
                            </div>
                            {t.expense_amount > 0 && (
                              <>
                                <div className="flex justify-between mb-1">
                                  <span className="text-gray-600">Despesa Associada:</span>
                                  <span className="text-red-600 font-bold">
                                    -{formatCurrency(t.expense_amount)}
                                  </span>
                                </div>
                                <div>
                                  <p className="text-gray-600 mb-1">Categoria da Despesa:</p>
                                  <p className="font-medium text-red-600">
                                    {expenseCategoryLabels[t.expense_category || ''] || t.expense_category}
                                  </p>
                                </div>
                              </>
                            )}
                            <div className="flex justify-between pt-2 border-t">
                              <span className="font-semibold text-gray-700">Valor Final:</span>
                              <span className="font-bold text-green-600">
                                {formatCurrency(t.net_amount - (t.expense_amount || 0))}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
                  <TrendingUp className="mx-auto text-gray-400 mb-4" size={48} />
                  <p className="text-gray-500 text-lg mb-2">Nenhuma entrada registrada</p>
                  <p className="text-gray-400">Os repasses médicos aparecerão aqui quando forem adicionados</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'expenses' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-800">Detalhamento de Despesas</h3>
                  <div className="flex gap-4 mt-1 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 bg-blue-500 rounded"></span>
                      Associadas a Repasses: {transferExpenses.length}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 bg-purple-500 rounded"></span>
                      Independentes: {independentExpenseDetails.length}
                    </span>
                  </div>
                </div>
                <span className="text-sm text-gray-500">Total: {allExpenses.length} transação(ões)</span>
              </div>
              
              {loadingExpenses ? (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-500">Carregando despesas...</p>
                </div>
              ) : allExpenses.length > 0 ? (
                <div className="space-y-4">
                  {allExpenses.map((t) => (
                    <div key={t.id} className={`bg-white border rounded-lg p-4 hover:shadow-sm transition-shadow ${
                      t.source === 'medical_transfer' ? 'border-blue-200' : 'border-purple-200'
                    }`}>
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-red-600">
                              {expenseCategoryLabels[t.expense_category || ''] || t.expense_category}
                            </span>
                            <span className={`text-xs px-2 py-1 rounded ${
                              t.source === 'medical_transfer' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                            }`}>
                              {getExpenseSourceLabel(t.source)}
                            </span>
                          </div>
                          <p className="text-gray-800">{t.description}</p>
                          <div className="text-sm text-gray-500">
                            <p>{formatDate(t.date)} • Ref: {formatMonthShort(t.reference_month)}</p>
                            {t.source === 'medical_transfer' && (
                              <p className="text-blue-600 mt-1">
                                Repasse original: {(t as any).parent_transfer_description}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold text-red-600">{formatCurrency(t.amount)}</p>
                          <p className="text-sm text-gray-500">Valor da Despesa</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
                  <TrendingDown className="mx-auto text-gray-400 mb-4" size={48} />
                  <p className="text-gray-500 text-lg mb-2">Nenhuma despesa registrada</p>
                  <p className="text-gray-400">
                    As despesas podem ser adicionadas através de repasses médicos ou transações independentes
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="border-t p-4 bg-gray-50">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-500">
              <div className="flex items-center gap-4">
                <span>Repasses: {incomeTransfers.length}</span>
                <span className="flex items-center gap-1">
                  <Database size={14} />
                  Despesas: {allExpenses.length} ({transferExpenses.length} + {independentExpenseDetails.length})
                </span>
              </div>
              {selectedMonth && ` • Período: ${formatMonth(selectedMonth)}`}
            </div>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
