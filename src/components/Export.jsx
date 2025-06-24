import React, { useState } from 'react';
import { Download, FileText, FileSpreadsheet, Calendar, Filter, Loader2 } from 'lucide-react';
import exportService from '../services/exportService';

export default function Export() {
  const [isExportingCSV, setIsExportingCSV] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [exportParams, setExportParams] = useState({
    start_date: '',
    end_date: '',
    count: 100
  });
  const [showFilters, setShowFilters] = useState(false);

  const handleExportCSV = async () => {
    try {
      setIsExportingCSV(true);
      console.log("🚀 Starting CSV export...");
      
      const params = {};
      if (exportParams.start_date) params.start_date = exportParams.start_date;
      if (exportParams.end_date) params.end_date = exportParams.end_date;
      if (exportParams.count) params.count = exportParams.count;
      
      const result = await exportService.exportTransactionsCSV(params);
      console.log("✅ CSV export completed:", result);
      
      // Show success message (you could add a toast notification here)
      alert(`CSV export successful! File saved as: ${result.filename}`);
    } catch (error) {
      console.error("❌ CSV export failed:", error);
      
      // Handle specific error cases
      if (error.response?.status === 400) {
        alert("No bank account connected. Please connect your bank account first.");
      } else if (error.response?.status === 401) {
        alert("Authentication failed. Please sign in again.");
      } else if (error.response?.status === 403) {
        alert("Access denied. Please check your permissions.");
      } else {
        alert("Failed to export CSV. Please try again.");
      }
    } finally {
      setIsExportingCSV(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      setIsExportingPDF(true);
      console.log("🚀 Starting PDF export...");
      
      const params = {};
      if (exportParams.start_date) params.start_date = exportParams.start_date;
      if (exportParams.end_date) params.end_date = exportParams.end_date;
      if (exportParams.count) params.count = exportParams.count;
      
      const result = await exportService.exportTransactionsPDF(params);
      console.log("✅ PDF export completed:", result);
      
      // Show success message (you could add a toast notification here)
      alert(`PDF export successful! File saved as: ${result.filename}`);
    } catch (error) {
      console.error("❌ PDF export failed:", error);
      
      // Handle specific error cases
      if (error.response?.status === 400) {
        alert("No bank account connected. Please connect your bank account first.");
      } else if (error.response?.status === 401) {
        alert("Authentication failed. Please sign in again.");
      } else if (error.response?.status === 403) {
        alert("Access denied. Please check your permissions.");
      } else {
        alert("Failed to export PDF. Please try again.");
      }
    } finally {
      setIsExportingPDF(false);
    }
  };

  const handleParamChange = (field, value) => {
    setExportParams(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const resetFilters = () => {
    setExportParams({
      start_date: '',
      end_date: '',
      count: 100
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <Download className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Export Financial Data</h3>
            <p className="text-sm text-gray-600">Download your transaction history in various formats</p>
          </div>
        </div>
        
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Filter className="w-4 h-4" />
          {showFilters ? 'Hide' : 'Show'} Filters
        </button>
      </div>

      {/* Export Filters */}
      {showFilters && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={exportParams.start_date}
                onChange={(e) => handleParamChange('start_date', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={exportParams.end_date}
                onChange={(e) => handleParamChange('end_date', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Transactions
              </label>
              <select
                value={exportParams.count}
                onChange={(e) => handleParamChange('count', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={50}>50 transactions</option>
                <option value={100}>100 transactions</option>
                <option value={250}>250 transactions</option>
                <option value={500}>500 transactions</option>
                <option value={1000}>1000 transactions</option>
              </select>
            </div>
          </div>
          
          <div className="mt-4 flex justify-end">
            <button
              onClick={resetFilters}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Reset Filters
            </button>
          </div>
        </div>
      )}

      {/* Export Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* CSV Export */}
        <div className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <FileSpreadsheet className="w-5 h-5 text-green-600" />
            </div>
            
            <div className="flex-1">
              <h4 className="font-medium text-gray-900 mb-1">Export as CSV</h4>
              <p className="text-sm text-gray-600 mb-3">
                Download transaction data in spreadsheet format. Perfect for analysis in Excel or Google Sheets.
              </p>
              
              <button
                onClick={handleExportCSV}
                disabled={isExportingCSV}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isExportingCSV ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Download CSV
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* PDF Export */}
        <div className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 text-red-600" />
            </div>
            
            <div className="flex-1">
              <h4 className="font-medium text-gray-900 mb-1">Export as PDF</h4>
              <p className="text-sm text-gray-600 mb-3">
                Generate a professional PDF report with your transaction history. Great for record keeping.
              </p>
              
              <button
                onClick={handleExportPDF}
                disabled={isExportingPDF}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isExportingPDF ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Download PDF
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Export Info */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-3">
          <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <Calendar className="w-3 h-3 text-blue-600" />
          </div>
          <div>
            <h5 className="text-sm font-medium text-blue-900 mb-1">Export Information</h5>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Exports include all transaction details: date, amount, category, merchant, and status</li>
              <li>• CSV files can be opened in Excel, Google Sheets, or any spreadsheet application</li>
              <li>• PDF reports include a professional layout with transaction summary</li>
              <li>• Files are automatically named with timestamp for easy organization</li>
              <li>• Use filters to export specific date ranges or limit transaction count</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
} 