import { useEffect, useState } from "react";
import { motion } from "framer-motion";

const data = [
  {
    name: "Lauren Contreras",
    text: "They have awesome customer service. Definitely love the way appscrip works",
    img: "https://randomuser.me/api/portraits/women/44.jpg",
  },
  {
    name: "Edward Alexander",
    text: "Great experience, highly recommended for everyone.",
    img: "https://randomuser.me/api/portraits/men/32.jpg",
  },
  {
    name: "Diana Johnston",
    text: "Amazing team and smooth service!",
    img: "https://randomuser.me/api/portraits/women/68.jpg",
  },
];

export default function Testimonials() {
  const [index, setIndex] = useState(0);

  // Auto change every 2 sec
  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % data.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="pt-10 pb-24 bg-white/60 backdrop-blur-xl overflow-hidden">
      <div className="max-w-6xl mx-auto px-6">

        {/* Title */}
        <h2 className="text-3xl font-bold mb-16 text-gray-900">
          Testimonials
        </h2>

        <div className="flex flex-col md:flex-row items-center justify-between gap-16">

          {/* LEFT SIDE - CURVED PATH */}
          <div className="relative w-64 h-72 flex items-center justify-center">

            {/* SVG Curve Line */}
            <svg
              className="absolute left-1/2 -translate-x-1/2"
              width="120"
              height="300"
              viewBox="0 0 120 300"
              fill="none"
            >
              <path
                d="M60 0 C20 80, 100 150, 60 300"
                stroke="#d1d5db"
                strokeWidth="2"
                fill="none"
              />
            </svg>

            {/* Avatars */}
            {data.map((item, i) => {
              const positions = [
                { top: "10%", left: "50%" },
                { top: "45%", left: "20%" },
                { top: "80%", left: "50%" },
              ];

              return (
                <motion.div
                  key={i}
                  className="absolute"
                  style={{
                    top: positions[i].top,
                    left: positions[i].left,
                    transform: "translate(-50%, -50%)",
                  }}
                  animate={{
                    scale: index === i ? 1.3 : 1,
                    opacity: index === i ? 1 : 0.5,
                  }}
                  transition={{ duration: 0.4 }}
                >
                  <img
                    src={item.img}
                    alt={item.name}
                    className={`w-14 h-14 rounded-full border-4 shadow-md object-cover
                    ${
                      index === i
                        ? "border-green-500"
                        : "border-white"
                    }`}
                  />
                </motion.div>
              );
            })}
          </div>

          {/* RIGHT SIDE - CONTENT */}
          <motion.div
            key={index}
            initial={{ opacity: 0, x: 80 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-xl bg-white/70 backdrop-blur-lg p-10 rounded-3xl shadow-xl"
          >
            {/* Quote */}
            <p className="text-xl italic text-gray-700 mb-6 leading-relaxed">
              “{data[index].text}”
            </p>

            {/* Stars */}
            <div className="flex mb-4 text-green-500">
              ⭐⭐⭐⭐⭐
            </div>

            {/* User */}
            <div className="flex items-center gap-4">
              <img
                src={data[index].img}
                className="w-10 h-10 rounded-full object-cover"
              />
              <h4 className="font-semibold text-gray-900">
                {data[index].name}
              </h4>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}