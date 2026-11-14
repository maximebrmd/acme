<?php

namespace Peal\InboxReviews\Requests;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class SetReviewAnsweredInboxReviewsRequest extends JsonSerializableType
{
    /**
     * @var bool $answered
     */
    #[JsonProperty('answered')]
    public bool $answered;

    /**
     * @param array{
     *   answered: bool,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->answered = $values['answered'];
    }
}
