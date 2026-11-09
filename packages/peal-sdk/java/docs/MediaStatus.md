

# MediaStatus

## anyOf schemas
* [MediaStatusAnyOf](MediaStatusAnyOf.md)
* [MediaStatusAnyOf1](MediaStatusAnyOf1.md)
* [MediaStatusAnyOf2](MediaStatusAnyOf2.md)
* [MediaStatusAnyOf3](MediaStatusAnyOf3.md)

## Example
```java
// Import classes:
import social.peal.model.MediaStatus;
import social.peal.model.MediaStatusAnyOf;
import social.peal.model.MediaStatusAnyOf1;
import social.peal.model.MediaStatusAnyOf2;
import social.peal.model.MediaStatusAnyOf3;

public class Example {
    public static void main(String[] args) {
        MediaStatus exampleMediaStatus = new MediaStatus();

        // create a new MediaStatusAnyOf
        MediaStatusAnyOf exampleMediaStatusAnyOf = new MediaStatusAnyOf();
        // set MediaStatus to MediaStatusAnyOf
        exampleMediaStatus.setActualInstance(exampleMediaStatusAnyOf);
        // to get back the MediaStatusAnyOf set earlier
        MediaStatusAnyOf testMediaStatusAnyOf = (MediaStatusAnyOf) exampleMediaStatus.getActualInstance();

        // create a new MediaStatusAnyOf1
        MediaStatusAnyOf1 exampleMediaStatusAnyOf1 = new MediaStatusAnyOf1();
        // set MediaStatus to MediaStatusAnyOf1
        exampleMediaStatus.setActualInstance(exampleMediaStatusAnyOf1);
        // to get back the MediaStatusAnyOf1 set earlier
        MediaStatusAnyOf1 testMediaStatusAnyOf1 = (MediaStatusAnyOf1) exampleMediaStatus.getActualInstance();

        // create a new MediaStatusAnyOf2
        MediaStatusAnyOf2 exampleMediaStatusAnyOf2 = new MediaStatusAnyOf2();
        // set MediaStatus to MediaStatusAnyOf2
        exampleMediaStatus.setActualInstance(exampleMediaStatusAnyOf2);
        // to get back the MediaStatusAnyOf2 set earlier
        MediaStatusAnyOf2 testMediaStatusAnyOf2 = (MediaStatusAnyOf2) exampleMediaStatus.getActualInstance();

        // create a new MediaStatusAnyOf3
        MediaStatusAnyOf3 exampleMediaStatusAnyOf3 = new MediaStatusAnyOf3();
        // set MediaStatus to MediaStatusAnyOf3
        exampleMediaStatus.setActualInstance(exampleMediaStatusAnyOf3);
        // to get back the MediaStatusAnyOf3 set earlier
        MediaStatusAnyOf3 testMediaStatusAnyOf3 = (MediaStatusAnyOf3) exampleMediaStatus.getActualInstance();
    }
}
```


