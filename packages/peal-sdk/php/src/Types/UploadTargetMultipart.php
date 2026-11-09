<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class UploadTargetMultipart extends JsonSerializableType
{
    /**
     * @var string $expiresAt
     */
    #[JsonProperty('expiresAt')]
    public string $expiresAt;

    /**
     * @var int $partSize
     */
    #[JsonProperty('partSize')]
    public int $partSize;

    /**
     * @var array<UploadPart> $parts
     */
    #[JsonProperty('parts'), ArrayType([UploadPart::class])]
    public array $parts;

    /**
     * @param array{
     *   expiresAt: string,
     *   partSize: int,
     *   parts: array<UploadPart>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->expiresAt = $values['expiresAt'];
        $this->partSize = $values['partSize'];
        $this->parts = $values['parts'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
