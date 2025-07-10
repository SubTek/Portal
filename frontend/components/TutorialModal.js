import { motion } from 'framer-motion';

export default function TutorialModal({ tutorial, step, onNext, onClose }) {
  return (
    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="fixed bg-white p-8 rounded shadow">
      <h2>{tutorial.title}</h2>
      <p>{tutorial.content[step]}</p>
      <button onClick={onNext}>Next</button>
      <button onClick={onClose}>Close</button>
    </motion.div>
  );
}
