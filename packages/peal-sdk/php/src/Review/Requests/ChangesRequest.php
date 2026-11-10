<?php

namespace Peal\Review\Requests;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class ChangesRequest extends JsonSerializableType
{
    /**
     * @var string $approvalId
     */
    #[JsonProperty('approvalId')]
    public string $approvalId;

    /**
     * @var string $subjectHash
     */
    #[JsonProperty('subjectHash')]
    public string $subjectHash;

    /**
     * @var string $comment
     */
    #[JsonProperty('comment')]
    public string $comment;

    /**
     * @param array{
     *   approvalId: string,
     *   subjectHash: string,
     *   comment: string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->approvalId = $values['approvalId'];
        $this->subjectHash = $values['subjectHash'];
        $this->comment = $values['comment'];
    }
}
