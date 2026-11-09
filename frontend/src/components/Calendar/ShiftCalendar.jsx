import React, { useContext } from 'react';
import { Box, Typography, Grid, Paper, Chip, Checkbox, Tooltip } from '@mui/material';
import { shiftSlotColor, shiftSlotShortLabel } from '../../utils/dateUtils';
import { getJewishHoliday, isMajorJewishHoliday } from '../../utils/hebrewCalendar';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import WeekendIcon from '@mui/icons-material/Weekend';
import FestivalIcon from '@mui/icons-material/Celebration';
import { AuthContext } from '../../App';

const ShiftCalendar = ({
  shifts = [],
  onShiftClick,
  viewMode,
  month,
  year,
  selectedShiftIds = [],
  onToggleSelectShift = null,
  isSelectionMode = false,
  onSelectDay = null
}) => {
  const { user } = useContext(AuthContext);

  const getDaysInMonth = (m, y) => {
    return new Date(y, m, 0).getDate();
  };

  const daysInMonth = getDaysInMonth(month, year);
  const firstDay = new Date(year, month - 1, 1).getDay();

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanks = Array.from({ length: firstDay }, (_, i) => i);
  const weekDays = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

  const getShiftsForDay = (day) => {
    return shifts.filter(s => {
      const d = new Date(s.date);
      return d.getDate() === day && d.getMonth() + 1 === month && d.getFullYear() === year;
    });
  };

  return (
    <Box sx={{ mt: 2 }}>
      <Grid container spacing={1}>
        {weekDays.map((day, idx) => (
          <Grid item xs={12/7} key={day}>
            <Paper
              sx={{
                p: 1,
                textAlign: 'center',
                bgcolor: (idx === 5 || idx === 6) ? 'grey.200' : 'primary.50',
                fontWeight: 'bold',
                borderRadius: 1
              }}
            >
              <Typography variant="subtitle2" fontWeight="bold">
                {day}
              </Typography>
            </Paper>
          </Grid>
        ))}

        {blanks.map(blank => (
          <Grid item xs={12/7} key={`blank-${blank}`} />
        ))}

        {days.map(day => {
          const dayDate = new Date(year, month - 1, day);
          const dayOfWeek = dayDate.getDay(); // 5 = Friday, 6 = Saturday
          const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;
          const holiday = getJewishHoliday(year, month, day);
          const isMajorHoliday = isMajorJewishHoliday(year, month, day);

          const todayObj = new Date();
          const isToday = day === todayObj.getDate() &&
                          month === (todayObj.getMonth() + 1) &&
                          year === todayObj.getFullYear();

          const dayShifts = getShiftsForDay(day);
          const hasEmptyShift = dayShifts.some(s => !s.assignments || s.assignments.length === 0);
          const allDaySelected = isSelectionMode && dayShifts.length > 0 && dayShifts.every(s => selectedShiftIds.includes(s.id));

          let dayBgColor = 'background.paper';
          if (isToday) {
            dayBgColor = '#fffde7'; // Soft pleasant light yellow for today
          } else if (isMajorHoliday) {
            dayBgColor = '#f3e5f5'; // Light purple/lavender for festive Jewish holidays
          } else if (holiday) {
            dayBgColor = '#e8eaf6'; // Light indigo for special Jewish dates
          } else if (isWeekend && dayShifts.length === 0) {
            dayBgColor = '#f5f5f5';
          } else if (viewMode === 'admin' && hasEmptyShift && !isWeekend) {
            dayBgColor = '#fff3e0';
          }

          let dayBorder = '1px solid #e0e0e0';
          if (isToday) {
            dayBorder = '2.5px solid #fbc02d'; // Golden border for today
          } else if (isMajorHoliday) {
            dayBorder = '1.5px solid #ab47bc';
          } else if (holiday) {
            dayBorder = '1px solid #7986cb';
          } else if (isWeekend) {
            dayBorder = '1px dashed #bdbdbd';
          } else if (hasEmptyShift && viewMode === 'admin') {
            dayBorder = '1px solid #ffb74d';
          }

          return (
            <Grid item xs={12/7} key={day}>
              <Paper
                sx={{
                  p: 1,
                  minHeight: 110,
                  bgcolor: dayBgColor,
                  border: dayBorder,
                  borderRadius: 1.5,
                  position: 'relative',
                  boxShadow: isToday ? '0 2px 10px rgba(251, 192, 45, 0.35)' : 'none',
                  transition: 'background-color 0.2s, box-shadow 0.2s',
                  '&:hover': { bgcolor: isToday ? '#fff9c4' : (isWeekend ? '#eeeeee' : 'action.hover') }
                }}
              >
                {/* Day Header */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                    <Box
                      sx={{
                        bgcolor: isToday ? '#fbc02d' : 'transparent',
                        color: isToday ? '#1a1a1a' : (isWeekend ? 'text.secondary' : 'text.primary'),
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 'bold',
                        fontSize: { xs: '0.75rem', sm: '0.875rem' }
                      }}
                    >
                      {day}
                    </Box>
                    {isToday && (
                      <Chip
                        label="★ היום"
                        size="small"
                        sx={{
                          bgcolor: '#fbc02d',
                          color: '#212121',
                          fontWeight: 'bold',
                          height: 20,
                          fontSize: '0.68rem',
                          border: '1px solid #f57f17'
                        }}
                      />
                    )}
                    {holiday && (
                      <Tooltip title={holiday}>
                        <Chip
                          label={holiday}
                          size="small"
                          icon={<FestivalIcon sx={{ fontSize: '11px !important' }} />}
                          sx={{
                            bgcolor: isMajorHoliday ? '#ba68c8' : '#9fa8da',
                            color: '#fff',
                            fontWeight: 'bold',
                            height: 20,
                            maxWidth: { xs: 80, sm: 120 },
                            fontSize: { xs: '0.62rem', sm: '0.7rem' },
                            '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis', px: 0.5 }
                          }}
                        />
                      </Tooltip>
                    )}
                  </Box>

                  {isSelectionMode && dayShifts.length > 0 && onSelectDay && (
                    <Tooltip title="בחר / בטל בחירה לכל משמרות היום">
                      <Checkbox
                        size="small"
                        checked={allDaySelected}
                        indeterminate={dayShifts.some(s => selectedShiftIds.includes(s.id)) && !allDaySelected}
                        onChange={() => onSelectDay(dayShifts)}
                        sx={{ p: 0 }}
                      />
                    </Tooltip>
                  )}

                  {hasEmptyShift && viewMode === 'admin' && !isWeekend && (
                    <Tooltip title="קיימות משמרות ללא מתנדב ביום זה">
                      <WarningAmberIcon color="warning" sx={{ fontSize: { xs: 13, sm: 16 } }} />
                    </Tooltip>
                  )}
                </Box>

                {/* Shifts list */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  {dayShifts.map(shift => {
                    const isAssigned = shift.assignments?.some(a => a.user_id === user?.user_id);
                    const enrolledCount = shift.assignments?.length || 0;
                    const maxVol = shift.max_volunteers || 1;
                    const isFull = enrolledCount >= maxVol;
                    const isSelected = selectedShiftIds.includes(shift.id);

                    const names = shift.assignments?.map(a => a.user_name || 'מתנדב').join(', ') || '';
                    const titlePrefix = shift.title ? `★ ` : '';
                    const statusText = isFull 
                      ? `${names ? names + ' ' : ''}(${enrolledCount}/${maxVol} מלא)` 
                      : (enrolledCount === 0 ? `0/${maxVol} פנוי` : `${names} (${enrolledCount}/${maxVol})`);

                    let chipBgColor = shiftSlotColor(shift.slot);
                    if (isSelected) {
                      chipBgColor = 'primary.dark';
                    } else if (enrolledCount === 0) {
                      chipBgColor = '#e53935'; // Red for holes
                    } else if (isFull && !isAssigned) {
                      chipBgColor = '#546e7a'; // Muted slate when full
                    } else if (isAssigned) {
                      chipBgColor = '#2e7d32'; // Green when currently assigned
                    }

                    const chipElement = (
                      <Chip
                        key={shift.id}
                        label={
                          isSelectionMode ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                              {isSelected ? <CheckBoxIcon sx={{ fontSize: 13 }} /> : <CheckBoxOutlineBlankIcon sx={{ fontSize: 13 }} />}
                              <span>{titlePrefix}{shiftSlotShortLabel(shift.slot)} ({enrolledCount}/{maxVol})</span>
                            </Box>
                          ) : (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {isAssigned && <CheckCircleIcon sx={{ fontSize: 13 }} />}
                              <span>{titlePrefix}{shiftSlotShortLabel(shift.slot)}: {statusText}</span>
                            </Box>
                          )
                        }
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isSelectionMode && onToggleSelectShift) {
                            onToggleSelectShift(shift.id);
                          } else {
                            onShiftClick(shift);
                          }
                        }}
                        sx={{
                          bgcolor: chipBgColor,
                          color: 'white',
                          height: { xs: 20, sm: 24 },
                          fontSize: { xs: '0.65rem', sm: '0.72rem' },
                          fontWeight: 500,
                          cursor: 'pointer',
                          border: isSelected ? '2px solid #000' : 'none',
                          '&:hover': { opacity: 0.9 }
                        }}
                      />
                    );

                    return names ? (
                      <Tooltip key={shift.id} title={`רשומים: ${names}`} placement="top" arrow>
                        {chipElement}
                      </Tooltip>
                    ) : (
                      chipElement
                    );
                  })}

                  {/* Weekend label */}
                  {isWeekend && dayShifts.length === 0 && (
                    <Box sx={{ textAlign: 'center', mt: { xs: 0.5, sm: 1.5 }, color: 'text.disabled' }}>
                      <WeekendIcon sx={{ fontSize: { xs: 15, sm: 18 }, mb: -0.5 }} />
                      <Typography variant="caption" display="block" sx={{ fontSize: { xs: '0.6rem', sm: '0.7rem' } }}>
                        סופ"ש
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Paper>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
};

export default ShiftCalendar;
