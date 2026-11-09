<?php

namespace Peal\Tests\Core\Json;

use JsonSerializable;
use PHPUnit\Framework\TestCase;
use Peal\Core\Json\JsonEncoder;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Types\ArrayType;

enum Shape: string implements JsonSerializable
{
    case Square = "SQUARE";
    case Circle = "CIRCLE";
    case Triangle = "TRIANGLE";

    /**
     * @return string
     */
    public function jsonSerialize(): string
    {
        return $this->value;
    }
}

class ShapeType extends JsonSerializableType
{
    /**
     * @var Shape $shape
     */
    #[JsonProperty('shape')]
    public Shape $shape;

    /**
     * @var Shape[] $shapes
     */
    #[ArrayType([Shape::class])]
    #[JsonProperty('shapes')]
    public array $shapes;

    /**
     * @param Shape $shape
     * @param Shape[] $shapes
     */
    public function __construct(
        Shape $shape,
        array $shapes,
    ) {
        $this->shape = $shape;
        $this->shapes = $shapes;
    }
}

class EnumTest extends TestCase
{
    public function testEnumSerialization(): void
    {
        $object = new ShapeType(
            Shape::Circle,
            [Shape::Square, Shape::Circle, Shape::Triangle]
        );

        $expectedJson = JsonEncoder::encode([
            'shape' => 'CIRCLE',
            'shapes' => ['SQUARE', 'CIRCLE', 'TRIANGLE']
        ]);

        $actualJson = $object->toJson();

        $this->assertJsonStringEqualsJsonString(
            $expectedJson,
            $actualJson,
            'Serialized JSON does not match expected JSON for shape and shapes properties.'
        );
    }
}
