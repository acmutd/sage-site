const Planner = () => {
  return (
    <div className="flex items-center justify-center mt-[4.2rem] h-[calc(100vh-4.2rem)] bg-innercontainer">
      <div className="relative flex justify-center items-center aspect-[2/1] h-full">
        {/* Blurred Background Image */}
        <img
          src="/PlannerDesign.png"
          alt="Planner Preview"
          className="absolute inset-0 h-[calc(100vh-4.2rem)] object-cover blur-sm z-0"
        />

        {/* Overlay Message */}
        <div className="bg-bglight bg-opacity-40 border border-border px-8 py-6 rounded-2xl shadow-lg text-center z-10">
          <h2>
            Degree Planner Coming Soon
          </h2>
          <p >Not available in experimental release</p>
        </div>
      </div>
    </div>
  );
};

export default Planner;
