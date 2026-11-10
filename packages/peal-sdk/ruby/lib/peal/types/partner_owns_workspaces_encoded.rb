# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class PartnerOwnsWorkspacesEncoded < Internal::Types::Model
      field :tag, -> { Peal::Types::PartnerOwnsWorkspacesEncodedTag }, optional: false, nullable: false, api_name: "_tag"

      field :owned, -> { Integer }, optional: false, nullable: false
    end
  end
end
