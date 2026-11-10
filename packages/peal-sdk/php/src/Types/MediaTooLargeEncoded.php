<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class MediaTooLargeEncoded extends JsonSerializableType
{
    /**
     * @var ?string $code
     */
    #[JsonProperty('code')]
    public ?string $code;

    /**
     * @var ?string $message
     */
    #[JsonProperty('message')]
    public ?string $message;

    /**
     * @var ?string $requestId
     */
    #[JsonProperty('requestId')]
    public ?string $requestId;

    /**
     * @var int $byteSize
     */
    #[JsonProperty('byteSize')]
    public int $byteSize;

    /**
     * @var value-of<MediaTooLargeEncodedKind> $kind
     */
    #[JsonProperty('kind')]
    public string $kind;

    /**
     * @var int $maxByteSize
     */
    #[JsonProperty('maxByteSize')]
    public int $maxByteSize;

    /**
     * @param array{
     *   byteSize: int,
     *   kind: value-of<MediaTooLargeEncodedKind>,
     *   maxByteSize: int,
     *   code?: ?string,
     *   message?: ?string,
     *   requestId?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->code = $values['code'] ?? null;
        $this->message = $values['message'] ?? null;
        $this->requestId = $values['requestId'] ?? null;
        $this->byteSize = $values['byteSize'];
        $this->kind = $values['kind'];
        $this->maxByteSize = $values['maxByteSize'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
