# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class NoticeEventPostApproved < Internal::Types::Model
      field :by, -> { Peal::Types::ReviewParty }, optional: false, nullable: false

      field :late, -> { Internal::Types::Boolean }, optional: false, nullable: false

      field :post_id, -> { String }, optional: false, nullable: false, api_name: "postId"
    end
  end
end
