export default function Page() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-900 p-4">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-bold mb-4">Project Files Missing</h1>
        <p className="text-slate-600 mb-4">
          It looks like the application files were deleted (possibly during a sync or import step). 
          The basic configuration has been restored so the development server can start.
        </p>
        <p className="text-sm text-slate-500">
          Please let me know if you would like to rebuild the AudioSync Pro application from scratch or if you want to restore a specific backup!
        </p>
      </div>
    </div>
  );
}
