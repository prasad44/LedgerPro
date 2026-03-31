import { HomeWorkflow } from "@/components/layout/home-workflow";

export default function DashboardPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-800">Home</h1>
        <p className="text-sm text-gray-500 mt-1">
          Welcome to LedgerPro. Use the workflow below to get started.
        </p>
      </div>
      <HomeWorkflow />
    </div>
  );
}
