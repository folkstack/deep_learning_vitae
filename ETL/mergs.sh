(cd ~/tempy && sqlite3 ~/tempy/batch.db \
  'drop table if exists ticker' \
  '.mode csv' \
  '.import "data/data/AAPL/ticker.csv" ticker' \
  'delete from ticker where symbol="AAPL"' \
  '.quit' \
&& cd data/data; \
  for dir in *; \
    do if [ -f "$dir/ticker.csv" ]; \
    then echo $dir && cd $dir && sqlite3 ~/tempy/batch.db \
      'attach database "'"$dir"'.db" as asset' \
      'insert into main.ticker select * from asset.ticker' \
      'detach database asset' \
      ".quit" \
    && cd ..; \
  fi; \
  done
exit
)
