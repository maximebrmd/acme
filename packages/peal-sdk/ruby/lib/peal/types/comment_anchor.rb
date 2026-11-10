# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class CommentAnchor < Internal::Types::Model
      field :channel_id, -> { String }, optional: false, nullable: false, api_name: "channelId"

      field :selection, -> { Peal::Types::CommentSelection }, optional: false, nullable: true
    end
  end
end
