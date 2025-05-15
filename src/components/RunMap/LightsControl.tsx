import styles from './style.module.css';

interface ILightsProps {
  setLights: (_lights: boolean) => void;
  lights: boolean;
}

// 移除了隐私模式控制按钮，保留组件结构以避免引用错误
const LightsControl = ({ setLights, lights }: ILightsProps) => {
  return null;
};

export default LightsControl;