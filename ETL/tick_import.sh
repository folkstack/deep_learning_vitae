for dir in $@; \
  do if [ -f "$dir/ticker.csv" ]; \
  then echo $dir && cd $dir && sqlite3 $dir.db \
    'drop table if exists ticker' \
    '.mode csv' \
    '.import ticker.csv ticker' \
    ".quit" \
  && cd ..; \
fi; \
done
exit
