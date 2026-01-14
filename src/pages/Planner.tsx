import { useEffect, useState } from 'react';

const Planner = () => {
  const activationDate = new Date('2026-01-29T19:00:00-06:00');
  const targetDate = new Date('2026-03-30T00:00:00-06:00');
  
  const [showCountdown, setShowCountdown] = useState(new Date() >= activationDate);

  useEffect(() => {
    if (!showCountdown) {
      const checkTimer = setInterval(() => {
        if (new Date() >= activationDate) {
          setShowCountdown(true);
        }
      }, 60000); // Check every minute
      return () => clearInterval(checkTimer);
    }
  }, [showCountdown]);

  const calculateTimeLeft = () => {
    const difference = +targetDate - +new Date();
    
    if (difference > 0) {
      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60)
      };
    }
    return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  };

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <>
        <style>{`
          .ellipsis span {
            animation: fade 1.5s infinite;
          }
          .ellipsis span:nth-child(2) {
            animation-delay: 0.2s;
          }
          .ellipsis span:nth-child(3) {
            animation-delay: 0.4s;
          }
          @keyframes fade {
            0%, 100% { opacity: 0; }
            50% { opacity: 1; }
          }
        `}</style>

        <div className="flex items-center justify-center mt-[4.2rem] h-[calc(100vh-4.2rem)] bg-innercontainer">
        <div className="relative flex justify-center items-center aspect-[2/1] h-full">
          {/* Blurred Background Image */}
          <img
            src="/PlannerDesign.png"
            alt="Planner Preview"
            className="absolute inset-0 h-[calc(100vh-4.2rem)] object-cover blur-sm z-0"
          />

          {!showCountdown ? (
              <>
                  <div className="bg-bglight bg-opacity-40 border border-border px-8 py-6 rounded-2xl shadow-lg text-center z-10">
                  <h2>
                    Degree Planner Coming Soon
                  </h2>
                  <p >Not available in experimental release</p>
                </div>
              </>
            ) : <>
                  <div className="bg-bglight bg-opacity-40 border border-border px-8 py-6 rounded-2xl shadow-lg text-center z-10">
                    <h2 className="text-3xl font-bold mb-2">
                      Degree Planner Launching Soon
                    </h2>
                    <p className="text-textgray mb-6">Releasing in <span className="ellipsis"><span>.</span><span>.</span><span>.</span></span></p>
                    
                    <div className="flex gap-4 justify-center mt-6">
                      {[
                        { value: timeLeft.days, label: 'Days' },
                        { value: timeLeft.hours, label: 'Hours' },
                        { value: timeLeft.minutes, label: 'Minutes' },
                        { value: timeLeft.seconds, label: 'Seconds' }
                      ].map((unit, i) => (
                        <div key={i} className="flex flex-col items-center">
                          <div className="bg-bgdark border border-border rounded-lg px-4 py-3 min-w-[70px]">
                            <span className="text-3xl font-bold text-[#5AED86]">
                              {String(unit.value).padStart(2, '0')}
                            </span>
                          </div>
                          <span className="text-sm text-textSecondary mt-2">{unit.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
              </>
          }
        </div>
      </div>
    </>
  );
};

export default Planner;