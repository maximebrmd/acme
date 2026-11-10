<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class ReplyInvalidEncoded extends JsonSerializableType
{
    /**
     * @var value-of<ReplyInvalidEncodedTag> $tag
     */
    #[JsonProperty('_tag')]
    public string $tag;

    /**
     * @var ?int $length
     */
    #[JsonProperty('length')]
    public ?int $length;

    /**
     * @var ?int $maximum
     */
    #[JsonProperty('maximum')]
    public ?int $maximum;

    /**
     * @var value-of<ReplyInvalidEncodedReason> $reason
     */
    #[JsonProperty('reason')]
    public string $reason;

    /**
     * @var ?string $unit
     */
    #[JsonProperty('unit')]
    public ?string $unit;

    /**
     * @param array{
     *   tag: value-of<ReplyInvalidEncodedTag>,
     *   reason: value-of<ReplyInvalidEncodedReason>,
     *   length?: ?int,
     *   maximum?: ?int,
     *   unit?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->tag = $values['tag'];
        $this->length = $values['length'] ?? null;
        $this->maximum = $values['maximum'] ?? null;
        $this->reason = $values['reason'];
        $this->unit = $values['unit'] ?? null;
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
