<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class RateCardXRates extends JsonSerializableType
{
    /**
     * @var int $dmCreate
     */
    #[JsonProperty('dmCreate')]
    public int $dmCreate;

    /**
     * @var int $dmEventRead
     */
    #[JsonProperty('dmEventRead')]
    public int $dmEventRead;

    /**
     * @var int $ownedRead
     */
    #[JsonProperty('ownedRead')]
    public int $ownedRead;

    /**
     * @var int $postCreate
     */
    #[JsonProperty('postCreate')]
    public int $postCreate;

    /**
     * @var int $postCreateWithUrl
     */
    #[JsonProperty('postCreateWithUrl')]
    public int $postCreateWithUrl;

    /**
     * @var int $postRead
     */
    #[JsonProperty('postRead')]
    public int $postRead;

    /**
     * @var int $userRead
     */
    #[JsonProperty('userRead')]
    public int $userRead;

    /**
     * @param array{
     *   dmCreate: int,
     *   dmEventRead: int,
     *   ownedRead: int,
     *   postCreate: int,
     *   postCreateWithUrl: int,
     *   postRead: int,
     *   userRead: int,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->dmCreate = $values['dmCreate'];
        $this->dmEventRead = $values['dmEventRead'];
        $this->ownedRead = $values['ownedRead'];
        $this->postCreate = $values['postCreate'];
        $this->postCreateWithUrl = $values['postCreateWithUrl'];
        $this->postRead = $values['postRead'];
        $this->userRead = $values['userRead'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
