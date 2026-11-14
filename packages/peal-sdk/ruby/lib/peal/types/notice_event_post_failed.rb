# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class NoticeEventPostFailed < Internal::Types::Model
      field :channel, -> { Peal::Types::NoticeChannel }, optional: false, nullable: true

      field :not_sent, -> { Peal::Types::PostPartsNotSent }, optional: true, nullable: false, api_name: "notSent"

      field :post_id, -> { String }, optional: false, nullable: false, api_name: "postId"

      field :reason, -> { Peal::Types::FailureReason }, optional: false, nullable: false
    end
  end
end
