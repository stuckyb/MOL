import java.io.FileNotFoundException;

import reader.ReaderManager;
import reader.TabularDataConverter;
import reader.plugins.*;


public class run {
    private static void runReader(TabularDataReader reader) {
        String[] record;

        while (reader.hasNextTable()) {
            reader.moveToNextTable();

            System.out.println("TABLE: " + reader.getCurrentTableName());

            while (reader.tableHasNextRow()) {
                record = reader.tableGetNextRow();
                for (int cnt = 0; cnt < record.length; cnt++) {
                    System.out.print(cnt > 0 ? ", " + record[cnt] : record[cnt]);
                }

                System.out.println();
            }

            //System.out.println();
        }

        System.out.println("file extension: " + reader.getFileExtensions()[0]);

        reader.closeFile();
    }

    private static void testFile(TabularDataReader reader, String filename) {
        if (reader.testFile(filename))
            System.out.println("Valid " + reader.getShortFormatDesc() + " file.");
        else
            System.out.println("Not a " + reader.getShortFormatDesc() + " file.");
    }

    private static void runReaders() {
        TabularDataReader reader = new CSVReader();
        reader.openFile("testdata/test.csv");

        runReader(reader);
        testFile(reader, "test_file.csv");
        System.out.println();

        reader = new ExcelReader();
        reader.openFile("testdata/test.xls");
        runReader(reader);
        System.out.println();

        reader.openFile("testdata/test.xlsx");
        runReader(reader);
        System.out.println();

        reader = new OpenDocReader();
        reader.openFile("testdata/test.ods");
        runReader(reader);
    }

    /**
     * This just tests the basic functionality of the reader system and plugins.
     */
    public static void main(String[] args) throws Exception {
        //runReaders();

        // Create the ReaderManager and load the plugins.
        ReaderManager rm = new ReaderManager();
        try {
            rm.loadReaders();
        } catch (FileNotFoundException e) {
            System.out.println(e);
        }

        // print descriptions for all supported file formats
        for (TabularDataReader reader : rm) {
            System.out.println(reader.getFormatDescription() + " ");
            System.out.println(reader.getFormatString());
        }
        System.out.println();

        // Open a file and print the data.
        //System.out.println(Thread.currentThread().getContextClassLoader().getResource("sqlite").getFile());
        //runReader(rm.openFile("testdata/test.xlsx"));
        //runReader(rm.openFile("testdata/test.csv", "CSV"));
        //System.out.println(System.getProperty("user.dir"));
        //runReader(rm.openFile("testdata/test.zip", "DWCA"));
        
        TabularDataReader tdr = rm.openFile("testdata/test.ods");
        //TabularDataReader tdr = rm.openFile("testdata/fishtest.zip");
        TabularDataConverter tdc = new TabularDataConverter(tdr, "jdbc:sqlite:sampledata/test.sqlite");
        tdc.convert();
        tdr.closeFile();
    }
}
