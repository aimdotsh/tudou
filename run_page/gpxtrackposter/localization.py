# Copyright 2016-2023 Florian Pigorsch & Contributors. All rights reserved.
#
# Use of this source code is governed by a MIT-style
# license that can be found in the LICENSE file.

import locale


# day_of_week: 0-6 (0=Monday)
# If short is False return the full day name, otherwise return the shortest
# possible abbreviation (e.g. the first letter)
def localized_day_of_week_name(day_of_week: int, short: bool) -> str:
    assert 0 <= day_of_week <= 6

    # locale.getlocale() might return (None, None)
    try:
        locale_name = locale.getlocale()[0]
    except:
        locale_name = None

    # Fallback to English names if nl_langinfo is not available or fails
    try:
        import calendar
        if short:
            if locale_name == "zh_CN":
                # Chinese day abbreviations: 一, 二, 三, 四, 五, 六, 日
                names = ["一", "二", "三", "四", "五", "六", "日"]
                return names[day_of_week]
            return calendar.day_name[day_of_week][0].upper()
        return calendar.day_name[day_of_week]
    except:
        # Very basic fallback
        names = ["M", "T", "W", "T", "F", "S", "S"]
        return names[day_of_week]
