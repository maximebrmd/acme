# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class DeletionIncompleteEncoded < Internal::Types::Model
      field :tag, -> { Peal::Types::DeletionIncompleteEncodedTag }, optional: false, nullable: false, api_name: "_tag"

      field :subscriptions_cancelled, -> { Integer }, optional: false, nullable: false, api_name: "subscriptionsCancelled"
    end
  end
end
