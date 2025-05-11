import styles from './style.module.css';

interface ILightsProps {
  setLights: (_lights: boolean) => void;
  lights: boolean;
}

const LightsControl = ({ setLights, lights }: ILightsProps) => {

  return (
        <div className={"  " + styles.lights}>
        </div>
  );
};

export default LightsControl;
