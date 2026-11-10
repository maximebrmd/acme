# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module CampaignObjective
      extend Peal::Internal::Types::Enum

      AWARENESS = "awareness"
      TRAFFIC = "traffic"
      ENGAGEMENT = "engagement"
      LEADS = "leads"
      APP_PROMOTION = "appPromotion"
      SALES = "sales"
      OTHER = "other"
    end
  end
end
