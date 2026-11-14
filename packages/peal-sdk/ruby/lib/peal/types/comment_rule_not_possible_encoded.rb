# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class CommentRuleNotPossibleEncoded < Internal::Types::Model
      field :tag, -> { Peal::Types::CommentRuleNotPossibleEncodedTag }, optional: false, nullable: false, api_name: "_tag"

      field :code, -> { String }, optional: true, nullable: false

      field :message, -> { String }, optional: true, nullable: false

      field :request_id, -> { String }, optional: true, nullable: false, api_name: "requestId"

      field :channels, -> { Internal::Types::Array[Peal::Types::ChannelCommentRule] }, optional: false, nullable: false

      field :reason, -> { Peal::Types::CommentRuleRefusal }, optional: false, nullable: false
    end
  end
end
