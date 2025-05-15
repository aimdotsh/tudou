import styles from './style.module.css';

interface ILightsProps {
  setLights: (_lights: boolean) => void;
  lights: boolean;
}

// 移除了隐私模式控制按钮，保留组件结构以避免引用错误
const LightsControl = ({ setLights, lights }: ILightsProps) => {
  return (
    <div className={"mapboxgl-ctrl mapboxgl-ctrl-group " + styles.lights}>
      {/* 隐私模式按钮已移除 */}
    </div>
  );
};

export default LightsControl;