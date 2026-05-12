import { intComma } from '@/utils/utils';
import { motion } from 'framer-motion';

interface IStatProperties {
  value: string | number;
  description: string;
  className?: string;
  citySize?: number;
  onClick?: () => void;
}

const Stat = ({
  value,
  description,
  className = 'pb-4 w-full',
  citySize,
  onClick,
}: IStatProperties) => (
  <motion.div 
    initial={{ opacity: 0, x: -10 }}
    whileInView={{ opacity: 1, x: 0 }}
    viewport={{ once: true }}
    className={`${className} group cursor-pointer select-none`} 
    onClick={onClick}
  >
    <div className="flex items-baseline gap-2">
      <span className={`text-${citySize || 4}xl md:text-${citySize ? citySize + 1 : 5}xl font-black italic bg-gradient-to-br from-white to-white/40 bg-clip-text text-transparent transition-all duration-300 group-hover:from-orange-500 group-hover:to-orange-300`}>
        {intComma(value.toString())}
      </span>
      <span className="text-lg font-medium text-slate-500 italic group-hover:text-slate-300 transition-colors uppercase tracking-wider">
        {description}
      </span>
    </div>
  </motion.div>
);

export default Stat;
