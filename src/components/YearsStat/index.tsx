import YearStat from '@/components/YearStat';
import useActivities from '@/hooks/useActivities';
import { INFO_MESSAGE } from '@/utils/const';

const YearsStat = ({ year, onClick, onClickTypeInYear }: { year: string, onClick: (_year: string) => void,
    onClickTypeInYear: (_year: string, _type: string) => void }) => {
  const { years } = useActivities();
  
  // 如果选择的是"Total"，显示"Total"和所有年份的信息
  // 如果选择的是具体年份，只显示该年份的信息
  let displayYears = [];
  if (year === 'Total') {
    // 先显示Total，然后按照年份降序排列
    displayYears = ['Total', ...years.slice().sort((a, b) => parseInt(b) - parseInt(a))];
  } else {
    displayYears = [year];
  }

  return (
    <div className="w-full lg:w-full pb-16 pr-16 lg:pr-16">
      <section className="pb-0">
        <p className="leading-relaxed">
          {INFO_MESSAGE(years.length, year)}
          <br />
        </p>
      </section>
      <hr color="red" />
      {displayYears.map((yearItem) => (
        <YearStat key={yearItem} year={yearItem} onClick={onClick} onClickTypeInYear={onClickTypeInYear}/>
      ))}
    </div>
  );
};

export default YearsStat;
