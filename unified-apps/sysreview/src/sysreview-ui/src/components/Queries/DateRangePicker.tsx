import { FC, useEffect, useRef, useState } from "react";
import { InputGroup } from "react-bootstrap";
import DatePicker from "react-datepicker";
import {
  dateToString,
  getDatePickerDefaults,
  stringToDate,
} from "../../api/utility";

interface DateRangePickerProps {
  includeRange: boolean;
  range: [string, string];
  setRange: (range: [string, string]) => void;
  disabled: boolean;
}

const DateRangePicker: FC<DateRangePickerProps> = ({
  disabled,
  includeRange: cIncludeRange,
  range,
  setRange,
}) => {
  const [from, to] = getDatePickerDefaults();
  const [date, setDate] = useState<[Date | null, Date | null]>([from, to]);
  const [includeRange, setIncludeRange] = useState(cIncludeRange);
  const includeRef = useRef<HTMLInputElement>(null);

  const updateRange = () => {
    // if checkbox is unticked, unset range by providing empty string
    if (!includeRef.current?.checked) {
      setRange(["", ""]);
      return;
    }
    // convert and update in the query object using setrange
    let range: [string, string] = ["", ""];
    if (date[0]) {
      range[0] = dateToString(date[0]);
    }
    if (date[1]) {
      range[1] = dateToString(date[1]);
    }
    setRange(range);
  };

  useEffect(() => {
    const [rangeFrom, rangeTo] = range;

    // if from or to is defined then convert to date and set local date state or get default and set it
    const from = rangeFrom
      ? stringToDate(rangeFrom)
      : getDatePickerDefaults()[0];
    const to = rangeTo ? stringToDate(rangeTo) : getDatePickerDefaults()[1];

    setDate([from, to]);
  }, [range]);

  useEffect(() => {
    setIncludeRange(cIncludeRange);
  }, [cIncludeRange]);

  return (
    <InputGroup className="mb-3">
      <InputGroup.Text>DATE RANGE</InputGroup.Text>
      <DatePicker
        onChange={(date) => setDate(date)}
        className="rounded-0"
        selectsRange
        onCalendarClose={updateRange}
        startDate={date[0]}
        endDate={date[1]}
        dateFormat="yyyy-MM"
        showMonthYearPicker
        disabled={disabled || !includeRange}
      />
      {!disabled && (
        <InputGroup.Text className="bg-transparent c-text-primary border-0">
          <label className="cp">
            <input
              type="checkbox"
              ref={includeRef}
              checked={includeRange}
              onChange={(e) => {
                setIncludeRange(e.target.checked);
                updateRange();
              }}
              disabled={disabled}
            />{" "}
            Include Date Range in search
          </label>
        </InputGroup.Text>
      )}
    </InputGroup>
  );
};

export default DateRangePicker;
