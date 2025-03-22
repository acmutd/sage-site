const Planner = () => {
  return (
    <div className="relative pt-20 h-screen w-full overflow-hidden">
      {/* Blurred Background Image */}
      <img
        src="/PlannerDesign.png"
        alt="Planner Preview"
        className="absolute inset-0 h-full w-full object-cover blur-md brightness-75 z-0"
      />

      {/* Overlay Message */}
      <div className="relative z-10 flex items-center justify-center h-full">
        <div className="bg-black bg-opacity-60 px-8 py-6 rounded-2xl shadow-lg text-center">
          <h1 className="text-3xl md:text-5xl font-bold text-white">
            Experimental Release
          </h1>
          <p className="text-white mt-2 text-lg">Coming Soon</p>
        </div>
      </div>
    </div>
  );
};

export default Planner;
