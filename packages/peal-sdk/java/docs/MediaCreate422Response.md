

# MediaCreate422Response

## anyOf schemas
* [AltTextTooLongEncoded](AltTextTooLongEncoded.md)
* [MediaTooLargeEncoded](MediaTooLargeEncoded.md)
* [UnsupportedMediaTypeEncoded](UnsupportedMediaTypeEncoded.md)

## Example
```java
// Import classes:
import social.peal.model.MediaCreate422Response;
import social.peal.model.AltTextTooLongEncoded;
import social.peal.model.MediaTooLargeEncoded;
import social.peal.model.UnsupportedMediaTypeEncoded;

public class Example {
    public static void main(String[] args) {
        MediaCreate422Response exampleMediaCreate422Response = new MediaCreate422Response();

        // create a new AltTextTooLongEncoded
        AltTextTooLongEncoded exampleAltTextTooLongEncoded = new AltTextTooLongEncoded();
        // set MediaCreate422Response to AltTextTooLongEncoded
        exampleMediaCreate422Response.setActualInstance(exampleAltTextTooLongEncoded);
        // to get back the AltTextTooLongEncoded set earlier
        AltTextTooLongEncoded testAltTextTooLongEncoded = (AltTextTooLongEncoded) exampleMediaCreate422Response.getActualInstance();

        // create a new MediaTooLargeEncoded
        MediaTooLargeEncoded exampleMediaTooLargeEncoded = new MediaTooLargeEncoded();
        // set MediaCreate422Response to MediaTooLargeEncoded
        exampleMediaCreate422Response.setActualInstance(exampleMediaTooLargeEncoded);
        // to get back the MediaTooLargeEncoded set earlier
        MediaTooLargeEncoded testMediaTooLargeEncoded = (MediaTooLargeEncoded) exampleMediaCreate422Response.getActualInstance();

        // create a new UnsupportedMediaTypeEncoded
        UnsupportedMediaTypeEncoded exampleUnsupportedMediaTypeEncoded = new UnsupportedMediaTypeEncoded();
        // set MediaCreate422Response to UnsupportedMediaTypeEncoded
        exampleMediaCreate422Response.setActualInstance(exampleUnsupportedMediaTypeEncoded);
        // to get back the UnsupportedMediaTypeEncoded set earlier
        UnsupportedMediaTypeEncoded testUnsupportedMediaTypeEncoded = (UnsupportedMediaTypeEncoded) exampleMediaCreate422Response.getActualInstance();
    }
}
```


