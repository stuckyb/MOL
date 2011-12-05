# Overview #

The `shp2gft.py` script can be used to bulkload shapefiles to Google Fusion Tables. It supports specifying the max number of polygons (rows) per table. It also supports uploading in parallel using multiprocessing.

# Usage #

Type `shp2gft.py --help` for full usage information:

```shell
$ ./shp2gft.py --help
Usage: shp2gft.py [options]

Options:
  -h, --help    show this help message and exit
  -d DIR        Directory containing the Shapefiles.
  -t TABLE      Base table name.
  -e EMAIL      The GMail address used for authentication.
  -f CONFIG     The config YAML file.
  -n MAX_ROWS   Maximum polygons per table.
  -p PROCESSES  Number of processes.
  -c CHUNKS     Number of chunks per process.
```

Here's an example run:

```shell
$ ./shp2gft.py -d /data/jetz/cody -t mol-test-run -e eightysteele@gmail.com -f creds.yaml -n 1000
```
