import YearStat from '@/components/YearStat';
import useActivities from '@/hooks/useActivities';

const YearsStat = ({ year, onClick, onClickTypeInYear }: {
  year: string, onClick: (_year: string) => void,
  onClickTypeInYear: (_year: string, _type: string) => void
}) => {
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
    <div className="w-full lg:w-full pb-2 md:pb-16 pr-4 md:pr-16 lg:pr-16">

      {displayYears.map((yearItem) => (
        <YearStat key={yearItem} year={yearItem} onClick={onClick} onClickTypeInYear={onClickTypeInYear} />
      ))}
    </div>
  );
};

export default YearsStat;
