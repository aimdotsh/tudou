import styles from './style.module.css';

interface ILightsProps {
  setLights: (_lights: boolean) => void;
  lights: boolean;
}



export default LightsControl;
