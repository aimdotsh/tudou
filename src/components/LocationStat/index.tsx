import YearStat from '@/components/YearStat';
import {
  CHINESE_LOCATION_INFO_MESSAGE_FIRST,
  CHINESE_LOCATION_INFO_MESSAGE_SECOND,
} from '@/utils/const';

interface ILocationStatProps {
  changeYear: (_year: string) => void;
  changeCity: (_city: string) => void;
  changeType: (_type: string) => void;
  onClickTypeInYear: (_year: string, _type: string) => void;
  runs?: any[];
  year?: string;
}

const LocationStat = ({
  changeYear,
  changeCity,
  changeType,
  onClickTypeInYear,
  runs,
  year
}: ILocationStatProps) => (
  <div className="w-full pb-16 pl-4 sm:pl-4 md:pl-4 lg:w-full lg:pr-16 lg:pl-0">
    <YearStat year={year || "Total"} onClick={changeYear} onClickTypeInYear={onClickTypeInYear}/>
  </div>
);

export default LocationStat;
