// TODO: THIS IS THE DEFAULT DASHBOARD PAGE THAT THE USER WILL SEE AFTER AUTHENTICATION. ADD MAIN FUNCTIONALITY HERE.
// This is the entry point for users who have just signed in

import { motion } from "framer-motion";
import { Loader } from "lucide-react";

export default function Dashboard() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center justify-center"
    >
      <div className="max-w-5xl mx-auto relative px-4">
        {/* landing page goes here */}
        <div className="flex items-center justify-center min-h-[200px]">
          <Loader className="h-8 w-8 animate-spin mr-4" />
          Generating your project...
        </div>
      </div>
    </motion.div>
  );
}