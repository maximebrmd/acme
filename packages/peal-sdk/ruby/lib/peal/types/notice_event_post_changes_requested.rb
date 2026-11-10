# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class NoticeEventPostChangesRequested < Internal::Types::Model
      field :by, -> { Peal::Types::ReviewParty }, optional: false, nullable: false

      field :post_id, -> { String }, optional: false, nullable: false, api_name: "postId"
    end
  end
end
