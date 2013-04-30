package rest;

import java.io.*;
import java.nio.channels.Channels;
import java.nio.channels.ReadableByteChannel;

import javax.servlet.ServletContext;
import javax.ws.rs.*;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;

import reader.ReaderManager;
import reader.TabularDataConverter;
import reader.plugins.TabularDataReader;

import com.sun.jersey.core.header.FormDataContentDisposition;
import com.sun.jersey.multipart.FormDataBodyPart;
import com.sun.jersey.multipart.FormDataParam;
import java.util.ArrayList;
import java.util.List;


/**
 * Provides RESTful web services using Jersey JAX-RS implementation. 
 * Many of the public methods use Jackson Mapper to translate between 
 * JSON (received from/sent to the client) and Java objects.
 * Jersey POJOMappingFeature (entry in web.xml) allows to 
 * achieve this without any special annotations of mapped Java classes,
 * sometimes argument-less constructor is needed. Exception handling
 * is achieved through a custom error page for error 500 (entry in web.xml),
 * this eliminates the need for try-catch blocks.
 */
@Path("/")
public class Rest {
    private static final String sqliteFolder = "sqlite";
    @Context
    private static ServletContext context;

    /**
     * Get real path of the sqlite folder in classes folder.
     *
     * @return Real path of the sqlite folder with ending slash.
     */
    static String getSqliteDataPath() {
        return Thread.currentThread().getContextClassLoader().getResource(sqliteFolder).getFile();
    }

    /**
     * Upload file, convert into sqlite database, and return a DataSource object
     * representing the original data source.
     *
     * @param inputStream        File to be uploaded.
     * @param contentDisposition Form-data content disposition header.
     * @return Mapping representation of tabular data in the file.
     */
    @POST
    @Path("/inspectDataSource")
    @Produces(MediaType.APPLICATION_JSON)
    @Consumes(MediaType.MULTIPART_FORM_DATA)
    public DataSource inspectDataSource(
            @FormDataParam("own_name") List<FormDataBodyPart> own_name_bps,
            @FormDataParam("own_address") List<FormDataBodyPart> own_address_bps,
            @FormDataParam("own_phone") List<FormDataBodyPart> own_phone_bps,
            @FormDataParam("own_email") List<FormDataBodyPart> own_email_bps,
            @FormDataParam("keywords") String keywords,
            @FormDataParam("license") String license,
            @FormDataParam("embargo") String embargo,
            @FormDataParam("file") InputStream inputStream,
            @FormDataParam("file") FormDataContentDisposition contentDisposition)
            throws Exception {
        
        // Because we're using the media type MULTIPART_FORM_DATA, we can't
        // get Lists of strings directly from the method parameters.  Instead,
        // we get a List of FormDataBodyPart objects from Jersey, and we then
        // have to extract the strings we want from those objects.  So the next
        // chunk of code extract the data owner names, addresses, phone
        // numbers, and email addresses and builds a list of DataOwner objects.
        ArrayList<DataOwner> owners = new ArrayList<DataOwner>();
        String name, address, phone, email;
        for (int cnt = 0; cnt < own_name_bps.size(); cnt++) {
            name = own_name_bps.get(cnt).getValueAs(String.class);
            //System.out.println("NAME: " + name);
            address = own_address_bps.get(cnt).getValueAs(String.class);
            phone = own_phone_bps.get(cnt).getValueAs(String.class);
            email = own_email_bps.get(cnt).getValueAs(String.class);
            
            owners.add(new DataOwner(name, address, phone, email));
        }
        
        // Get the name of the uploaded file and create a new local file for the
        // SQLite representation of the data.
        String fileName = contentDisposition.getFileName();
        String sourcename = createUniqueFileName(fileName, "sqlite", getSqliteDataPath());
        File sqliteFile = new File(getSqliteDataPath() + sourcename + ".sqlite");
        if (fileName.endsWith(".sqlite"))  {
            // If we got a SQLite file, just copy it directly.
            writeFile(inputStream, sqliteFile);
        } else {
            // Copy the input file to a new, temporary local file and convert it
            // to a SQLite database.
            File tempFile = File.createTempFile("upload", fileName);
            writeFile(inputStream, tempFile);
            ReaderManager rm = new ReaderManager();
            rm.loadReaders();
            TabularDataReader tdr = rm.openFile(tempFile.getPath());
            TabularDataConverter tdc = new TabularDataConverter(tdr, "jdbc:sqlite:" + sqliteFile.getPath());
            tdc.convert();
            tdr.closeFile();
        }
        
        return new DataSource(sqliteFile, sourcename, fileName, owners, keywords, license, embargo);
    }
    
    @POST
    @Path("/uploadDataSource")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public String[] uploadDataSource(DataSourceMapping mapping) throws Exception {
        DataSourceUploader uploader = new DataSourceUploader(mapping, getSqliteDataPath());
        
        int rowcnt = uploader.uploadData();
        uploader.close();
        
        return new String[] {"success", String.valueOf(rowcnt)};
    }
    
    /**
     * Write InputStream to File.
     *
     * @param inputStream Input to read from.
     * @param file        File to write to.
     */
    private void writeFile(InputStream inputStream, File file) throws Exception {
        ReadableByteChannel rbc = Channels.newChannel(inputStream);
        FileOutputStream fos = new FileOutputStream(file);
        fos.getChannel().transferFrom(rbc, 0, 1 << 24);
        fos.close();
        System.out.println("received: " + file.getPath());
    }


    /**
     * Create a unique file name, using the provided file name as a starting
     * point.  Adds incremental number to base if file name already exists.
     *
     * @param fileName Name of the file.
     * @param extension The extension to use when checking for existing files.
     * @param folder Folder where the file is created.
     * @return The new file.
     */
    private String createUniqueFileName(String fileName, String extension, String folder) {
        // replace spaces with underscores
        String basename = fileName.replace(' ', '_');

        // replace periods with underscores
        basename = basename.replace('.', '_');
        
        String newfname = basename;
        File file = new File(folder + newfname + "." + extension);
        int i = 0;
        while (file.exists()) {
            newfname = basename + "_" + ++i;
            file = new File(folder + newfname + "." + extension);
        }
        
        return newfname;
    }

    /**
     * Download a file with a given filename and content.
     * 
     * @param filename   Name of the file.
     * @param content    Content of the file.
     * @return Response with 'attachment' Content-Disposition header.
     */
    @POST
    @Path("/download")
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    @Produces(MediaType.APPLICATION_OCTET_STREAM)
    public Response download(@FormParam("filename") String filename, @FormParam("content") String content) {
        return Response
        		.ok(content)
        		.header("Content-Disposition", "attachment; filename=" + filename)
        		.build();
    }

}
