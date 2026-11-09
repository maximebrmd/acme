

# UploadTarget

## anyOf schemas
* [UploadTargetAnyOf](UploadTargetAnyOf.md)
* [UploadTargetAnyOf1](UploadTargetAnyOf1.md)

## Example
```java
// Import classes:
import social.peal.model.UploadTarget;
import social.peal.model.UploadTargetAnyOf;
import social.peal.model.UploadTargetAnyOf1;

public class Example {
    public static void main(String[] args) {
        UploadTarget exampleUploadTarget = new UploadTarget();

        // create a new UploadTargetAnyOf
        UploadTargetAnyOf exampleUploadTargetAnyOf = new UploadTargetAnyOf();
        // set UploadTarget to UploadTargetAnyOf
        exampleUploadTarget.setActualInstance(exampleUploadTargetAnyOf);
        // to get back the UploadTargetAnyOf set earlier
        UploadTargetAnyOf testUploadTargetAnyOf = (UploadTargetAnyOf) exampleUploadTarget.getActualInstance();

        // create a new UploadTargetAnyOf1
        UploadTargetAnyOf1 exampleUploadTargetAnyOf1 = new UploadTargetAnyOf1();
        // set UploadTarget to UploadTargetAnyOf1
        exampleUploadTarget.setActualInstance(exampleUploadTargetAnyOf1);
        // to get back the UploadTargetAnyOf1 set earlier
        UploadTargetAnyOf1 testUploadTargetAnyOf1 = (UploadTargetAnyOf1) exampleUploadTarget.getActualInstance();
    }
}
```


