<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class UploadPart extends JsonSerializableType
{
    /**
     * @var int $byteSize
     */
    #[JsonProperty('byteSize')]
    public int $byteSize;

    /**
     * @var int $partNumber
     */
    #[JsonProperty('partNumber')]
    public int $partNumber;

    /**
     * @var SignedRequest $request
     */
    #[JsonProperty('request')]
    public SignedRequest $request;

    /**
     * @param array{
     *   byteSize: int,
     *   partNumber: int,
     *   request: SignedRequest,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->byteSize = $values['byteSize'];
        $this->partNumber = $values['partNumber'];
        $this->request = $values['request'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
